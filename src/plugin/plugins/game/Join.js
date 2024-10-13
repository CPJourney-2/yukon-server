import GamePlugin from '@plugin/GamePlugin';

import { isNumber } from '@utils/validation';

import Igloo from '@objects/room/Igloo';

export default class Join extends GamePlugin {
  constructor(handler) {
    super(handler);

    this.events = {
      join_server: this.joinServer,
      join_room: this.joinRoom,
      join_igloo: this.joinIgloo,
    };
  }

  // Events

  async joinServer(args, user) {
    if (await this.db.isMaintenance() && user.rank < 2) {
      user.send('close_with_error', { error: 'Maintenance period is active. Please try again later' })
      return await user.close()
    }

    if (user.isInQueue) return

    user.doLoginChecks();

    const puffles = await this.db.puffles.findAll({
      where: { userId: user.id },
    });

    let currentParty = null;

    for (const partyId in this.handler.crumbs.parties) {
      const party = this.handler.crumbs.parties[partyId];
      if (party.current) {
        currentParty = partyId;
      }
    }

    const partyQuests = await this.db.getUserPartyQuests(user.id);

    user.send('load_player', {
      user: user,
      rank: user.rank,
      streamer: user.streamer,
      coins: user.coins,
      partyCoins: user.partyCoins,
      gems: user.gems,
      inf_skill_points: user.inf_skill_points,
      highest_floor_reached: user.highest_floor_reached,
      buddies: user.buddies,
      buddyRequests: user.buddyRequests,
      ignores: user.ignores,
      inventory: user.inventory,
      igloos: user.igloos,
      furniture: user.furniture,
      flooring: user.flooring,
      music: user.music,
      locations: user.locations,
      stamps: user.stamps,
      username_verified: user.username_verified,
      unseen_postcards: user.postcards.unseen.length,
      scavenger_items: user.scavenger.collectedItems,
      puffles: puffles,
      party: currentParty,
      party_quests: partyQuests,
      transform: user.transform,
      interactions: user.popupInteractions.interactionNames,
      pirate_status: user.pirate_status
    });

    // Update token on database now that user has fully connected
    if (user.token.oldSelector) {
      this.db.authTokens.destroy({
        where: { userId: user.id, selector: user.token.oldSelector },
      });
    }

    if (user.token.selector && user.token.validatorHash) {
      this.db.authTokens.create({
        userId: user.id,
        selector: user.token.selector,
        validator: user.token.validatorHash,
      });
    }

    let spawn = this.getSpawn();

    if (user.rank === 10) {
      this.joinIgloo({ igloo: user.id, x: 0, y: 0 }, user);
    } else {
      user.joinRoom(spawn);
    }

    if (user.streamer) {
      user.send('info', {
        message: "Reminder: Streamer mode is currently ENABLED."
      });
    }

    user.joinedServer = true;
    user.joinedServerTimestamp = Date.now() / 1000 // epoch seconds

    if (user.rank >= 2) {
      this.discord.wallClock(`**${user.username}** clocked in`);

      for (let otherUser of Object.values(this.handler.users)) {
        if (otherUser.rank >= 2 && otherUser.id !== user.id) {
          otherUser.send('clocked_in', { username: user.username });
        }
      }
    }

    this.discord.userLog(`**${user.username}** joined!`);

    this.handler.plugins.plugins.chat.handleUserLogin(user);

    user.sessionJoinTime = Date.now();

    await this.handler.updateWorldPopulation();
  }

  async joinRoom(args, user) {
    if (!args.room || !isNumber(args.room)) return;

    //only used for money cheat logs
    user.joinedRoomTimestamp = Math.floor(Date.now() / 1000)

    this.plugins['actions']['events'].close_sprite(args, user);

    user.joinRoom(this.rooms[args.room], args.x, args.y);
  }

  /*_getRoomJoinIDForVeggieVillain(roomID, user) {
    roomID = parseInt(roomID);

    const villageIDs = {
      pre_village_solo: 860,
      post_village_solo: 861,
      post_village_multi: 200,
    };

    const hqIDs = {
      post_hq_multi: 803,
      pre_hq_solo: 862
    };

    const sportShopIDs = {
      post_sports_multi: 863,
      pre_sports_multi: 210,
    };

    const cornMaizeIDs = {
      start: 851,
      end: 859,
      maze_max: 857, // river + cliff + summit are after maze exit
      ...[851, 852, 853, 854, 855, 856, 857, 858, 859],
    };

    const shopIDs = {
      shop_solo: 864,
      shop_multi: 130,
    };
    
    const shopOfficeIDs = {
      office_solo: 865,
      office_multi: 131,
    };

    const summitIDs = {
      solo: 859,
      multi: 866,
    };
    

    const allIDs = Object.values({
      ...villageIDs, ...hqIDs, ...sportShopIDs,
      ...cornMaizeIDs, ...shopIDs, ...shopOfficeIDs, ...summitIDs
    });

    if (!allIDs.includes(roomID)) {
      return roomID;
    }

    if(Object.values(villageIDs).includes(roomID)) {
      if(user.missionStatus() <= 6) {
        return villageIDs.pre_village_solo;
      } else if(user.missionStatus() == 7) {
        return villageIDs.post_village_solo;
      } else {
        return villageIDs.post_village_multi;
      }

    } else if (Object.values(summitIDs).includes(roomID)) {
      if (user.missionStatus() >= 7) {
        return summitIDs.multi;
      } else {
        return summitIDs.solo;
      }

    } else if(Object.values(hqIDs).includes(roomID)) {
      if(user.missionStatus() == 8) {
        return hqIDs.post_hq_multi;
      } else {
        return hqIDs.pre_hq_solo;
      }

    } else if(Object.values(sportShopIDs).includes(roomID)) {
      if(user.missionStatus() == 8) {
        return sportShopIDs.post_sports_multi;
      } else {
        return sportShopIDs.pre_sports_multi;
      }

    } else if(roomID >= cornMaizeIDs.start && roomID <= cornMaizeIDs.end) {
      // Prevent user from going to corn maize if they can't and stop beyond if they haven't solved
      if (user.missionStatus() < 5 || (user.missionStatus() < 6 && roomID > cornMaizeIDs.maze_max)) {
        return 807; // send back to shack
      }

    } else if (Object.values(shopIDs).includes(roomID)) {
      if (user.missionStatus() < 8) {
        return shopIDs.shop_solo;
      }
    } else if (Object.values(shopOfficeIDs).includes(roomID)) {
      if (user.missionStatus() < 8) {
        return shopOfficeIDs.office_solo;
      }
    }

    

    return roomID;
  }*/

  async joinIgloo(args, user) {
    if (!args.igloo || !isNumber(args.igloo)) return;

    let igloo = await this.getIgloo(args.igloo);

    this.plugins['actions']['events'].close_sprite(args, user);

    user.joinRoom(igloo, args.x, args.y);
  }

  // Functions

  getSpawn() {
    let preferredSpawn = this.config.game.preferredSpawn;

    if (preferredSpawn && !this.rooms[preferredSpawn].isFull) {
      return this.rooms[preferredSpawn];
    }

    let spawns = Object.values(this.rooms).filter(
      (room) => room.spawn && !room.isFull
    );

    // All spawns full
    if (!spawns.length) {
      spawns = Object.values(this.rooms).filter(
        (room) => !room.game && !room.isFull
      );
    }

    return spawns[Math.floor(Math.random() * spawns.length)];
  }

  async getIgloo(id) {
    if (!isNumber(id)) {
      return null;
    }

    // Ensures igloos are above all default rooms
    let iglooId = id + this.config.game.iglooIdOffset;

    if (!(iglooId in this.rooms)) {
      let igloo = await this.db.getIgloo(id);

      if (!igloo) {
        return null;
      }

      this.rooms[iglooId] = new Igloo(
        igloo,
        this.db,
        this.config.game.iglooIdOffset,
        this.handler
      );
    }

    return this.rooms[iglooId];
  }
}
