import UserMixin from './UserMixin';

import pick from '@utils/pick';
import { isInRange } from '@utils/validation';

import BuddyCollection from '@database/collections/BuddyCollection';
import BuddyRequestCollection from '@database/collections/BuddyRequestCollection';
import FurnitureCollection from '@database/collections/FurnitureCollection';
import IglooCollection from '@database/collections/IglooCollection';
import LocationCollection from '@database/collections/LocationCollection';
import IgnoreCollection from '@database/collections/IgnoreCollection';
import FlooringCollection from '@database/collections/FlooringCollection';
import MusicCollection from '../../database/collections/MusicCollection';
import InventoryCollection from '@database/collections/InventoryCollection';
import ScavengerCollection from '@database/collections/ScavengerCollection';
import StampCollection from '@database/collections/StampCollection';
import PuffleCollection from '@database/collections/PuffleCollection';
import PostcardCollection from '@database/collections/PostcardCollection';

import PurchaseValidator from './purchase/PurchaseValidator';

import UserTowerController from '../tower/UserTowerController';

import EventEmitter from 'events'
import { Op } from 'sequelize';

import BaseWaddle from '../room/waddle/BaseWaddle'
import PopupInteractionCollection from "@database/collections/PopupInteractionCollection"

const GameUserMixin = {
  init(server, socket) {
    super.init(server, socket);

    this.crumbs = this.handler.crumbs;

    this.authenticated = false;
    this.joinedServer = false;
    this.token = {};

    this.room;
    this.minigameRoom;
    this.joinedRooms = new Set();

    this.x;
    this.y;
    this.frame;
    this.currentTower = null;

    this.lastStampCheck = null;
    this.stampCheckQueued = false;
    this.slotToChangeIglooTo = null;

    this.workRequested = false;

    // Keep track of work stuff for stamps
    this.workFulfillments = {
      coffeeServed: 0,
      pizzaServed: 0,
      coinsEarned: {
        pizza: 0,
        coffee: 0,
        berg: 0
      },
      smilingPenguins: 0,
      hasEaten: {
        pizza: false,
        coffee: false,
      }
    }

    //this.buddyRequests = [];

    // FOR VEGGIE VILLAIN
    this.replayingOperation = false
    this.missionReplayStatus = 0
    this.lastRoomBeforeMission = null

    this.onDanceFloor = false

    this.spectators = []
    this.currentlySpectating = null

    this.hasHadPartyCoinsReset = null

    this.validatePurchase = new PurchaseValidator(this, this.handler.discord);

    // Used for dynamic/temporary events
    this.events = new EventEmitter({ captureRejections: true })

    this.events.on('error', (error) => {
        this.handler.error(error)
    })
  },

  missionStatus() {
    if(this.replayingOperation) {
      return this.missionReplayStatus
    } else {
      return this.pirate_status
    }
  },

  tower() {
    if(this.currentTower) return this.currentTower

    this.currentTower = new UserTowerController(this)
    return this.currentTower
  },

  setItem(slot, item) {
    if (this[slot] == item) {
      return;
    }

    this.update({ [slot]: item });

    this.room.send(
      this,
      'update_player',
      { id: this.id, item: item, slot: slot },
      []
    );
    this.thrownSnowball = false;
  },

  joinRoom(room, x = 0, y = 0) {
    if (!room || room === this.room) {
      return;
    }

    if (this.minigameRoom && !this.waddle) return; // waddles join the room, then the server sends packet to start game

    if (this.waddle && this.waddle instanceof BaseWaddle) {
      if (room.id != this.waddle.roomId) {
        this.waddle.removeUserFromWaddle(this);
      }
    }

    if (room.isFull && !this.isModerator) {
      return this.send('error', {
        error: 'Sorry this room is currently full',
      });
    }

    if (!isInRange(x, 0, 1520)) {
      x = 0;
    }

    if (!isInRange(y, 0, 960)) {
      y = 0;
    }

    let exists = this.crumbs.rooms.some((room) => room.name === room?.name);
    if (!exists || room == null || Object.getPrototypeOf(room) === null)
      return;

    if (this.room) {
      this.room.remove(this);
    }

    this.gameOverTriggered = false;
    
    if (this.room?.outside) this.lastOutsideRoom = this.room.id
      
    this.room = room;
    this.x = x;
    this.y = y;
    this.frame = 1;
    this.thrownSnowball = false;

    this.room.add(this);

    if(!this.room.game && this.room.id <= this.config.game.iglooIdOffset) this.joinedRooms.add(this.room.name);
    this.checkRoomStamps();

    for (let user of this.room.mascotValues) {
      if(user.mascot.stamp != 0) this.addStamp(user.mascot.stamp);
    }

    if(this.mascot?.stamp) for (let user of this.room.allUserValues) {
      user.addStamp(this.mascot.stamp);
    }

    for(let id of this.spectators) {
      let user = this.handler.usersById[id]
      if(user && !this.room.game) {
        this.handler.plugins.plugins.join.joinRoom({room: this.room.id}, user)
      } else if(!user) {
        this.spectators = this.spectators.filter(_id => _id != id)
      }
    }

    if (this?.awardBelt == true) {
      this.awardBelt = false;

      setTimeout(() => {
        this.send('cj_belt_award');
      }, 150);
    }

    if(this.onDanceFloor) {
      this.handler.plugins.plugins.dancing.removePenguin(this)
    }
  },

  checkRoomStamps() {
    //walk around 30 rooms
    if (this.joinedRooms.size == 30) this.addStamp(15);

    //waddle around all party rooms
    if (this.handler.plugins.plugins.party.stampValid(190)) {
      let partyPassed = true;
      for (let room of this.crumbs.stamps_activity.partyRooms) {
        if (!this.joinedRooms.has(room)) partyPassed = false;
      }
      if (partyPassed) this.addStamp(190);
    }
  },

  doLoginChecks() {
    this.checkJobs();
    this.checkPartyCoinsReset(true);
    this.checkDoubleCoins();

    this.lastLogin = new Date();
    this.update({ lastLogin: this.lastLogin });
  },

  checkJobs() {
    if (!this.lastLogin) return;

    let today = new Date();
    let nextFirst = this.lastLogin;

    while (true) {
      nextFirst = new Date(
        nextFirst.getFullYear(),
        nextFirst.getMonth() + 1,
        1
      );
      if (nextFirst > today) break;

      this.addJobItems(nextFirst);
    }
  },

  addJobItems(date) {
    for (let job of Object.values(this.crumbs.jobs)) {
      let rewards = job.rewards;
      if (!rewards) continue;

      let meetsRequirements = true;
      for (let item of job.required_items) {
        meetsRequirements = this.inventory.includes(item) && meetsRequirements;
      }

      if (meetsRequirements) {
        if (rewards.postcard)
          this.addSystemPostcard(rewards.postcard, null, date);
        if (rewards.coins) this.updateCoins(rewards.coins);
      }
    }
  },

  checkDoubleCoins() {
    if (!this.lastLogin) return;
    if (!this.crumbs.double_coins.active) return;
    if(isNaN(parseInt(this.crumbs.double_coins.start))) return;

    let today = Date.now();
    if(today < parseInt(this.crumbs.double_coins.start * 1000)) return;

    let nextFirst = new Date(this.lastLogin).getTime();

    if(parseInt(this.crumbs.double_coins.start * 1000) > nextFirst) {
      this.addSystemPostcard(244, this.crumbs.double_coins.date);
    }
  },

  joinTable(table) {
    if (table && !this.minigameRoom) {
      this.gameOverTriggered = false;

      this.minigameRoom = table;

      this.minigameRoom.add(this);
    }
  },

  addBuddy(id, username, requester = false) {
    this.buddies.add(id);

    let online = id in this.handler.usersById;

    this.send('buddy_accept', {
      id: id,
      username: username,
      requester: requester,
      online: online,
    });
  },

  removeBuddy(id) {
    this.buddies.remove(id);

    this.send('buddy_remove', { id: id });
  },

  clearBuddyRequest(id) {
    //this.buddyRequests = this.buddyRequests.filter((request) => request != id);
  },

  updateCoins(coins, gameOver = false, hackName = null, gift = false, jobs = false, user=null) {
    coins = parseInt(coins);

    let hasStamps = true;
    let allStamps = this.crumbs.stamps[this.room?.stampGroup]?.stamps;
    let relevantStamps = [];
    if (gameOver || jobs) {
      if (allStamps) {
        for (let stamp of Object.keys(allStamps)) {
          if (!this.stamps.includes(stamp)) hasStamps = false;
          else relevantStamps.push(stamp);
        }
        if (hasStamps) coins *= 2;
      }
    }

    if (jobs) {
      this.send('job_coins', { coins: coins });
    }

    
    if (this?.handler?.elasticsearch) {
      if (jobs) {
        this.handler.elasticsearch.logCoins(this, "jobs", coins, hasStamps)
      } else if (gameOver && !gift && allStamps) {
        this.handler.elasticsearch.logCoins(this, "minigame", coins, hasStamps)
      } else if (gameOver && !gift && !allStamps) {
        this.handler.elasticsearch.logCoins(this, "minigame", coins, false)
      } else if (gift) {
        this.handler.elasticsearch.logCoins(this, "gift", coins, false, user)
      }
    }

    if (!isNaN(coins)) {
      coins = Math.max(Math.min(1000000000, this.coins + coins), 0);

      this.update({ coins: coins });
    }

    if (gameOver) {
      this.send('game_over', {
        coins: coins || this.coins,
        hasStamps: hasStamps,
        totalStamps: allStamps ? Object.keys(allStamps).length : 0,
        collectedStamps: relevantStamps.length,
        stampList: relevantStamps,
        room: hackName ? hackName : this.room.name,
        gift: gift,
        doubleCoins: this.crumbs.double_coins.active
      });
    }
  },

  async updateGems(gemsAdded, hide = false) {
    gemsAdded = parseInt(gemsAdded);
    let totalGems = this.gems;

    let maxGems = 0;
    for (let questId in this.handler.crumbs.party_quests) {
        let quest = this.handler.crumbs.party_quests[questId];
        let payout = this.handler.plugins.plugins.party.gemPayouts[quest.difficulty];
        maxGems += payout;
    }

    if (isNaN(gemsAdded)) {
      return;
    }

    if (this.rank < 2 && gemsAdded >= 0) {
      totalGems = Math.max(Math.min(maxGems, this.gems + gemsAdded), 0);
    } else {
      totalGems = Math.max(this.gems + gemsAdded, 0);
    }

    this.send('gems_added', { gems: totalGems, gemsAdded, hide });

    return this.update({ gems: totalGems });
  },

  updatePartyCoins(coins) {
    this.checkPartyCoinsReset();
    coins = parseInt(coins);

    if (!isNaN(coins)) {
      coins = Math.max(Math.min(10000000, this.partyCoins + coins), 0);

      this.update({ partyCoins: coins });
    }
  },

  checkPartyCoinsReset(set = false, send = false) {
    if (!this.lastLogin) return;

    // On login, dont try to reset the coins, but reset the check back to 0
    if (set && !send && this.pirate_status == 1) {
      return this.update({ pirate_status: 0 })
    }

    let today = new Date();

    let todayInPST = today.toLocaleString('en-US', {timeZone: "America/Los_Angeles", day:"numeric"})
    let lastLoginInPST = this.lastLogin.toLocaleString('en-US', {timeZone: "America/Los_Angeles", day:"numeric"})
    let currentMonthInPST = today.toLocaleString('en-US', {timeZone: "America/Los_Angeles", month:"numeric"})
    let lastLoginMonthInPST = this.lastLogin.toLocaleString('en-US', {timeZone: "America/Los_Angeles", month:"numeric"})

    let dateId = `${currentMonthInPST}-${todayInPST}`

    if (currentMonthInPST > lastLoginMonthInPST || todayInPST > lastLoginInPST) {
      if(this.hasHadPartyCoinsReset != dateId) {
        if (set) {
          this.update({ partyCoins: 0 });
          if (send) {
            this.send('add_party_coins', { partyCoins: this.partyCoins })
            this.update({ pirate_status: 1 })
            this.send('error', { error: "It's past midnight, so your ticket count has been reset." })
          }
        } else {
          this.partyCoins = 0;
          this.update({ pirate_status: 1 });
          this.send('error', { error: "It's past midnight, so your ticket count has been reset." });
        }
        this.hasHadPartyCoinsReset = dateId;
      }
    }
  },

  async updateSkillPoints(skillPoints) {
    skillPoints = parseInt(skillPoints);

    if (!isNaN(skillPoints)) {
      skillPoints = Math.max(Math.min(66, this.inf_skill_points + skillPoints), 0);

      this.update({ inf_skill_points: skillPoints });
    }
  },

  updateTransform(transformId, showForClient) {
    this.transform = transformId

    this.room.send(this, 'transform_player', { id: this.id, transform: this.transform }, showForClient ? [] : [this]);
  },

  checkStampPositionIndividual(position) {
    if (position.room && this.room.name != position.room) return false;
    if (
      position.pos1 &&
      (position.pos1[0] > this.x || position.pos1[1] > this.y)
    )
      return false;
    if (position.pos2 && position.pos2[0] < this.x && position.pos2[1] < this.y)
      return false;
    return true;
  },

  checkStampPosition(position) {
    let passedPosition = false;
    if (Array.isArray(position)) {
      for (let positionX of position) {
        passedPosition =
          passedPosition || this.checkStampPositionIndividual(positionX);
      }
    } else {
      passedPosition = this.checkStampPositionIndividual(position);
    }

    return passedPosition;
  },

  checkStampConstructionRoom() {
    if (!this.crumbs.stamps_activity.constructionEnabled) return false;

    return this.crumbs.stamps_activity.constructionRooms.includes(
      this.room.name
    );
  },

  checkStampWearingSlot(slot, items) {
    let passedSlot = false;
    if (Array.isArray(items)) {
      for (let item of items) {
        passedSlot = passedSlot || this[slot] === item;
      }
    } else {
      passedSlot = this[slot] === items;
    }
    return passedSlot;
  },

  checkStampWearing(wearing) {
    for (let [slot, items] of Object.entries(wearing)) {
      if (!this.checkStampWearingSlot(slot, items)) return false;
    }
    return true;
  },

  checkStampAge(age) {
    if (this.joinTime < new Date().getTime() - age * 24 * 60 * 60 * 1000)
      return true;
  },

  meetsStampConditionsIndividual(conditions) {
    if (!conditions) return false; //invalid stamp

    if (conditions.position && !this.checkStampPosition(conditions.position)) return false;
    if (conditions.inConstructionRoom && !this.checkStampConstructionRoom()) return false;
    if (conditions.partyEnabled && conditions.partyEnabled !== this.handler.plugins.plugins.party.party) return false;
    if (
      conditions.frame &&
      this.frame != conditions.frame &&
      this.tempFrame != conditions.frame
    )
      return false;
    if (conditions.wearing && !this.checkStampWearing(conditions.wearing))
      return false;
    if (conditions.emote && this.tempEmote != conditions.emote) return false;
    if (
      conditions.lessTempEmote &&
      this.lessTempEmote != conditions.lessTempEmote
    )
      return false;
    if (conditions.thrownSnowball && !this.thrownSnowball) return false;
    if (conditions.age && !this.checkStampAge(conditions.age)) return false;
    if (conditions.owns && !this.inventory.includes(conditions.owns)) return false;
    return true;
  },

  meetsStampConditions(conditions) {
    let passedConditions = false;
    if (Array.isArray(conditions)) {
      for (let condition of conditions) {
        passedConditions =
          passedConditions || this.meetsStampConditionsIndividual(condition);
      }
    } else {
      passedConditions = this.meetsStampConditionsIndividual(conditions);
    }
    return passedConditions;
  },

  checkIndividualStamps() {
    if(this.lastStampCheck && new Date() - this.lastStampCheck < 1000) {
      if(this.stampCheckQueued) return;
      
      this.stampCheckQueued = true;

      setTimeout(() => {
        this.checkIndividualStamps();
      }, 1000);

      return;
    }

    this.stampCheckQueued = false;
    this.lastStampCheck = new Date();

    for (let [stamp, stampInfo] of Object.entries(
      this.crumbs.stamps_activity.individualStamps
    )) {
      if (this.meetsStampConditions(stampInfo.conditions)) this.addStamp(stamp);
    }

    this.tempFrame = 0;
    this.tempEmote = 0;

    //this.checkMascotStamps();
  },

  addStamp(stamp) {
    if (this.stamps.includes(stamp)) return;
    this.stamps.add(stamp);
    this.send('stamp_earned', { stamp: stamp });
  
    if (this?.handler?.elasticsearch) {
      let stamps = this.handler.crumbs.stamps;
  
      // Loop through the stamp groups to find the specific stamp
      for (let groupId in stamps) {
        let group = stamps[groupId];
        let groupStamps = group.stamps;
  
        if (stamp in groupStamps) {
          let stampDetails = groupStamps[stamp];
          let stampName = stampDetails.name;
          let stampDescription = stampDetails.description;
          let stampDifficulty = stampDetails.rank;
  
          // Log the specific stamp
          this.handler.elasticsearch.logStamp(this, stamp, stampName, stampDescription, stampDifficulty);
          break;
        }
      }
    }
  },

  addPostcard(sender, cardId) {
    this.postcards.add(sender, cardId);
  },

  addSystemPostcard(cardId, extra = null, date = new Date()) {
    this.postcards.add(this, cardId, extra, date);
  },

  addQuest(questId) {
    this.handler.plugins.plugins.party.questComplete({questId: questId}, this)
  },

  async load(username) {
    return await this.reload({
      where: {
        username: username,
      },

      include: [
        {
          model: this.db.bans,
          as: 'ban',
          where: {
            expires: {
              [Op.gt]: Date.now(),
            },
          },
          required: false,
        },
        {
          model: this.db.mutes,
          as: 'mute',
          where: {
            expires: {
              [Op.gt]: Date.now(),
            },
          },
          required: false,
        },
        {
          model: this.db.buddies,
          as: 'buddies',
          include: {
            model: this.db.users,
            as: 'user',
            attributes: ['username', 'username_verified', 'id'],
            include: {
              model: this.db.mascots,
              as: 'mascot',
              required: false,
            },
          },
          separate: true,
        },
        {
          model: this.db.buddyRequests,
          as: 'buddyRequests',
          include: {
            model: this.db.users,
            as: 'user',
            attributes: ['username', 'username_verified', 'id'],
            include: {
              model: this.db.mascots,
              as: 'mascot',
              required: false,
            },
          },
          separate: true,
        },
        {
          model: this.db.ignores,
          as: 'ignores',
          include: {
            model: this.db.users,
            as: 'user',
            attributes: ['username', 'username_verified', 'id'],
            include: {
              model: this.db.mascots,
              as: 'mascot',
              required: false,
            },
          },
          separate: true,
        },
        {
          model: this.db.inventories,
          as: 'inventory',
          attributes: ['itemId'],
          separate: true,
        },
        {
          model: this.db.iglooInventories,
          as: 'igloos',
          attributes: ['iglooId'],
          separate: true,
        },
        {
          model: this.db.locationInventories,
          as: 'locations',
          attributes: ['locationId'],
          separate: true,
        },
        {
          model: this.db.furnitureInventories,
          as: 'furniture',
          separate: true,
        },
        {
          model: this.db.flooringInventories,
          as: 'flooring',
          attributes: ['flooringId'],
          separate: true,
        },
        {
          model: this.db.musicInventories,
          as: 'music',
          attributes: ['musicId'],
          separate: true,
        },
        {
          model: this.db.igloos,
          as: 'userIgloos',
          required: false
        },
        {
          model: this.db.scavengerItems,
          as: 'scavenger',
          separate: true,
        },
        {
          model: this.db.stamps,
          as: 'stamps',
          separate: true,
        },
        {
          model: this.db.mascots,
          as: 'mascot',
          required: false,
        },
        {
          model: this.db.stampbooks,
          as: 'stampbook',
          required: true,
        },
        {
          model: this.db.puffles,
          as: 'puffles',
          separate: true,
        },
        {
          model: this.db.postcards,
          as: 'postcards',
          include: {
            model: this.db.users,
            as: 'sender',
            attributes: ['username', 'username_verified', 'id'],
            include: {
              model: this.db.mascots,
              as: 'mascot',
              required: false,
            },
          },
          separate: true,
        },
        {
          model: this.db.popupInteractions,
          as: 'popupInteractions',
          separate: true,
        },
      ],

      order: [['ban', 'expires', 'DESC']],
    })
      .then((result) => {
        result.muted = result.muted || !!result.mute;
        result.buddies = new BuddyCollection(this, result.buddies);
        result.buddyRequests = new BuddyRequestCollection(this, result.buddyRequests);
        result.ignores = new IgnoreCollection(this, result.ignores);
        result.inventory = new InventoryCollection(this, result.inventory);
        result.igloos = new IglooCollection(this, result.igloos);
        result.furniture = new FurnitureCollection(this, result.furniture);
        result.locations = new LocationCollection(this, result.locations);
        result.flooring = new FlooringCollection(this, result.flooring);
        result.music = new MusicCollection(this, result.music);
        result.scavenger = new ScavengerCollection(this, result.scavenger);
        result.stamps = new StampCollection(this, result.stamps);
        result.puffles = new PuffleCollection(this, result.puffles);
        result.postcards = new PostcardCollection(this, result.postcards);
        result.popupInteractions = new PopupInteractionCollection(this, result.popupInteractions);

        const currentSlotIgloo = result.userIgloos.find(igloo => igloo.slot === this.igloo_slot);

        if (currentSlotIgloo) {
          this.iglooOpen = currentSlotIgloo.dataValues.locked ? 0 : 1;
          this.iglooBounds = currentSlotIgloo.dataValues.boundaries ? 1 : 0;
        } else {
            this.iglooOpen = 0;
            this.iglooBounds = 0;
        }

        result.walkingPuffleType =
          result.puffles.collection[result.walking.toString()]?.type;

        this.setPermissions();

        return true;
      })
      .catch((error) => {
        this.handler.error(error);

        return false;
      });
  },

  toJSON() {
    return pick(
      this,
      'id',
      'username',
      'displayName',
      'joinTime',
      'head',
      'face',
      'neck',
      'body',
      'hand',
      'feet',
      'color',
      'photo',
      'flag',
      'transforms',
      'transform',
      'x',
      'y',
      'frame',
      'username_verified',
      'email_verified',
      'walking',
      'walkingPuffleType',
      'openSprite',
      'mascotGiveaway',
      'iglooOpen',
      'iglooBounds',
      'igloo_slot',
    );
  },
};

Object.setPrototypeOf(GameUserMixin, UserMixin);

export default { ...UserMixin, ...GameUserMixin };
