import BaseHandler from './BaseHandler';

import MatchmakerFactory from '@objects/room/matchmaker/MatchmakerFactory'
import OpenIgloos from '@objects/room/OpenIgloos'
import Room from '@objects/room/Room'
import TowerJoiner from '@objects/room/TowerJoiner'
import TableFactory from '@objects/room/table/TableFactory'
import Waddle from '@objects/room/waddle/Waddle'
import BaseWaddle from '@objects/room/waddle/BaseWaddle'

import data from '@data/data'
import WaddleFactory from '../objects/room/waddle/WaddleFactory';

import bcrypt from 'bcrypt'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { v4 as uuid } from 'uuid'

export default class GameHandler extends BaseHandler {
  constructor(id, users, db, config, discord, redis) {
    super(id, users, db, config, discord, redis);

    this.reloadCrumbs();

    this.id = id;
    this.redis = redis;

    this.usersById = {};
    this.waitingQueue = {};
    this.waitingQueueIds = [];

    this.maxUsers = config.worlds[id].maxUsers;
    this.safeChat = config.worlds[id].safeChat;

    this.rooms = this.setRooms();
    this.setTables();
    this.setWaddles();

    this.openIgloos = new OpenIgloos();

    this.setMatchmakers()

    this.startPlugins('/game');

    this.updateWorldPopulation();
    this.startHourlyLogging();
  }

  reloadCrumbs() {
    data.reload();

    this.crumbs = {
      cards: data.cards,
      double_coins: data.double_coins,
      floorings: data.floorings,
      furnitures: data.furnitures,
      igloos: data.igloos,
      items: data.items,
      jobs: data.jobs,
      locations: data.locations,
      music: data.igloomusic,
      parties: data.parties,
      party_quests: data.party_quests,
      penguins_work: data.penguins_work,
      voyager: data.voyager,
      puffleitems: data.puffleitems,
      puffles: data.puffles,
      room_teleports: data.room_teleports,
      rooms: data.rooms,
      scavenger: data.scavenger,
      stamps_activity: data.stamps_activity,
      stamps: data.stamps,
      tables: data.tables,
      transformations: data.transformations,
      unlockcodes: data.unlockcodes,
    };
  }

  setRooms() {
    let rooms = {};

    for (let room of data.rooms) {
      if(room.id == 831) {
        rooms[room.id] = new TowerJoiner(room, this);
      } else {
        rooms[room.id] = new Room(room, this);
      }
    }

    return rooms;
  }

  setTables() {
    for (let table of data.tables) {
      let room = this.rooms[table.roomId];

      room.tables[table.id] = TableFactory.createTable(table, room);
    }
  }

  setWaddles() {
    for (let waddle of data.waddles) {
      let room = this.rooms[waddle.roomId];

      if(waddle.type == "cpj") room.waddles[waddle.id] = WaddleFactory.createWaddle(waddle, room, this);
      else room.waddles[waddle.id] = new Waddle(waddle);
    }

    
    for (let waddle of data.waddles) {
    }
  }

  handleGuard(message, user) {
    return !user.authenticated && message.action != 'game_auth';
  }

  async close(user) {
    try {
      if (!user) {
        return;
      }


      if(user.closedConnection) {
        console.log(`[${this.id}] User already closed connection: ${user.username} ${user.address}`);
        return
      }
      user.closedConnection = true
      user.server.cleanupSocket(user.socket.id, user)

      if (user.id && user.id in this.waitingQueue) {
        delete this.waitingQueue[user.id];
        this.waitingQueueIds.splice(this.waitingQueueIds.indexOf(user.id), 1);
      }

      if (!user.authenticated) {
        return this.closeAndUpdatePopulation(user);
      }

      console.log(`[${this.id}] Closed connection for: ${user.username} ${user.address}`);
      this.discord.userLog(`**${user.username}** disconnected!`);
      //user.send('close_with_error', {error: 'Connection was lost.\nPlease click to reload.'})

      if(user.currentTower) {
        user.currentTower.endGame()
      }

      if (user.room) {
        user.room.remove(user);
      }

      if (user.waddle) {
        let waddle = user.waddle
        if(waddle instanceof BaseWaddle) waddle.removeUserFromWaddle(user)
        else waddle.remove(user)
      }

      if (user.CJGame) {
        user.CJGame.forceEndGame(user.displayName + ' has left the game');
      }

      if (user.onDanceFloor) {
        this.plugins.plugins.dancing.removePenguin(user)
      }

      if (user.buddies) {
        user.buddies.sendOffline();
      }

      if (user.minigameRoom) {
        user.minigameRoom.remove(user);
      }

      if (user.id && user.id in this.usersById) {
        // this check makes sure the user hasnt relogged in in the meantime
        // - this was causing the disappearing penguins issue
        if(this.usersById[user.id] == user) {
          delete this.usersById[user.id];
        }
      }

      if (user.id) {
        this.openIgloos.remove(user);
      }

      if (user.joinedServer) {
        user.joinedServer = false;
      }

      if (this.elasticsearch) {
        user.sessionEndTime = Date.now();

        let sessionTime = user.sessionEndTime - user.sessionJoinTime;

        let sessionTimeInSeconds = sessionTime / 1000;

        await this.elasticsearch.logSession(user, sessionTimeInSeconds)
      }

      this.closeAndUpdatePopulation(user);
    } catch (error) {
      this.error(error);
    }
  }

  setMatchmakers() {
      for (let id in data.matchmakers) {
          let room = this.rooms[id]

          if(room) room.matchmaker = MatchmakerFactory.createMatchmaker(data.matchmakers[id], room)
      }
  }

  handleGuard(message, user) {
      return !user.authenticated && message.action != 'game_auth'
  }

  get redisPub() {
    return this.redis.redisClient;
}

  get joined() {
    return Object.values(this.users).filter((user) => user.joinedServer);
  }

  get population() {
    return this.joined.length + this.waitingQueueIds.length;
  }

  async closeAndUpdatePopulation(user) {
    super.close(user);
    await this.updateWorldPopulation();
    await this.updateWaitingQueue();
  }

  async updateWorldPopulation() {
    this.db.worlds.update(
      { population: this.population },
      { where: { id: this.id } }
    );
  }

  startHourlyLogging() {
    const logIfTopOfTheHour = async () => {
      const now = new Date();
      if (now.getMinutes() === 0) {
        if (this?.elasticsearch) {
          try {
            const maintenance = await this.db.isMaintenance();
            let currentParty = null;
            for (const partyId in this.crumbs.parties) {
              const party = this.crumbs.parties[partyId];
              if (party.current) {
                currentParty = party.name;
              }
            }
            await this.elasticsearch.logPopulation(this.population, maintenance, currentParty);

            let rooms = Object.values(this.rooms).sort((a, b) => a.population - b.population);
            let roomsData = {};
            for (let room of rooms) {
                if (room.population > 0) {
                    roomsData[room.name] = room.population;
                }
            }

            await this.elasticsearch.logRoomPopulation(roomsData, maintenance, currentParty);
          } catch (error) {
            console.error("Failed to log population:", error);
          }
        }
      }
    };

    logIfTopOfTheHour();
    setInterval(logIfTopOfTheHour, 60 * 1000);
  }

  async addToWaitingQueue(user, response) {
    user.isInQueue = true

    const joinedUsers = this.joined;
    const isUserJoined = joinedUsers.some(joinedUser => joinedUser.id === user.id);

    if (isUserJoined) {
      user.send('close_with_error', {error: "You are already in the game. You cannot join the queue."});
      return user.close();
    }

    if (user.id && user.id in this.waitingQueue) {
      user.send('close_with_error', {error: "You are already in the queue. You cannot join the queue again. You must reconnect on any tab you are logged in with this user. The queue will not update for you."});
      return user.close();
    }

    this.waitingQueue[user.id] = {user, response};
    this.waitingQueueIds.push(user.id);

    await this.updateWaitingQueue();
    await this.updateWorldPopulation();
  }


  async updateWaitingQueue() {
      if (
          Object.keys(this.waitingQueue).length > 0 &&
          this.population - this.waitingQueueIds.length < this.maxUsers
      ) {
          const nextUserId = this.waitingQueueIds[0];

          // Check if nextUserId is undefined or not in waitingQueue
          if (!nextUserId || !this.waitingQueue[nextUserId]) {
              console.warn(`Invalid user ID encountered in the queue: ${nextUserId}`);
              this.waitingQueueIds.shift();
              await this.updateWaitingQueue();
              return;
          }

          const {user, response} = this.waitingQueue[nextUserId];
          delete this.waitingQueue[nextUserId];
          const index = this.waitingQueueIds.indexOf(nextUserId);
          if (index > -1) {
              this.waitingQueueIds.splice(index, 1);
          }
          await this.sendJoinWorld(response, user);
      }

      // Update the position and queueLength for all users in the waiting queue
      const userIds = this.waitingQueueIds;
      for (let i = 0; i < this.waitingQueueIds.length; i++) {
          // First, ensure the user exists in the waitingQueue
          if (this.waitingQueue[userIds[i]]) {
              const {user, args} = this.waitingQueue[userIds[i]];

              // Now, ensure the user object is not undefined before sending updates
              if (user) {
                  user.send("wait_queue_update", {
                      userId: user.id,
                      position: i + 1,
                      // Update position to be 1-based index
                      queueLength: this.waitingQueueIds.length,
                  });
              }
          } else {
              console.warn(`No waitingQueue entry found for userId: ${userIds[i]}`);
          }
      }
  }

  async sendJoinWorld(response, user) {
    user.isInQueue = false;
    user.send('game_auth', response)
    await this.updateWorldPopulation();
  }
}
