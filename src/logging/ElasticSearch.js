import fs from "fs"

const { Client } = require('@elastic/elasticsearch')

export default class ElasticSearch {
    constructor(handler, config) {
        this.handler = handler
        this.config = config
        this.ready = false

        if (config.elasticsearch.production) {
            this.client = new Client({
                node: config.elasticsearch.url,
                auth: {
                  apiKey: {
                    id: config.elasticsearch.api_key_id,
                    api_key: config.elasticsearch.api_key,
                  }
                }
            })
        } else {
            this.client = new Client({
                node: config.elasticsearch.url,
                auth: {
                  apiKey: {
                    id: config.elasticsearch.api_key_id,
                    api_key: config.elasticsearch.api_key,
                  }
                },
                tls: {
                    ca: fs.readFileSync(config.elasticsearch.ca).toString(),
                    rejectUnauthorized: true
                }
            })
        }

        this.checkConnection()
    }

    async checkConnection() {
        try {
          const info = await this.client.info()
          console.log('Connected to ElasticSearch on', this.handler.id)
          this.ready = true
        } catch (error) {
          console.error('Error connecting to Elasticsearch:', error)
          // exit as this will only be called where ES is used (prod) or in dev envs where ES is likely being tested
          process.exit(1)
        }
    }

    async log(index, data) {
        try {
            index = `${this.config.elasticsearch.server_name}_${index}`

            data.timestamp = new Date().toISOString()
            data.world = this.handler.id

            await this.client.index({
                index: index,
                body: data,
            })
        } catch (error) {
            console.error('Error logging data to Elasticsearch:', error)
            // what do we do here? save to disk, how do we alert for loss of logs?
        }
    }

    async logChatMessage(user, message, filtered, modChat) {
        await this.log("chat", {
            username: user.username,
            userId: user.id,
            room: user.room.isIgloo ? user.room.username + "'s igloo" : user.room.name,
            message: message,
            filtered: filtered,
            modChat: modChat,
            muted: user.muted,
        })
    }

    async logCommand(user, command) {
        await this.log("command", {
            username: user.username,
            userId: user.id,
            room: user.room.isIgloo ? user.room.username + "'s igloo" : user.room.name,
            command: command,
        })
    }

    async logSession(user, time) {
        await this.log("sessions", {
            username: user.username,
            userId: user.id,
            sessionTime: time
        })
    }

    async logMinigame(user, game, score, doubleCoin, time) {
        await this.log("minigame", {
            username: user.username,
            userId: user.id,
            game: game,
            score: score,
            doubleCoin: doubleCoin,
            time: time
        })
    }

    async logItemPurchase(user, itemType, itemSubType, itemId, itemName, cost, amount=1) {
        await this.log("items", {
            username: user.username,
            userId: user.id,
            itemType: itemType,
            itemSubType: itemSubType,
            itemId: itemId,
            itemName: itemName,
            cost: cost,
            amount: amount
        })
    }

    async logPopulation(population, maintenance, party) {
        await this.log("population", {
            population: population,
            maintenance: maintenance,
            party: party
        })
    }

    async logRoomPopulation(roomsData, maintenance, party) {
        await this.log("rooms", {
            roomsData: roomsData,
            maintenance: maintenance,
            party: party
        })
    }

    async logStamp(user, stampId, stampName, stampDescription, stampDifficulty) {
        await this.log("stamps", {
            username: user.username,
            userId: user.id,
            stampId: stampId,
            stampName: stampName,
            stampDescription: stampDescription,
            stampDifficulty: stampDifficulty
        })
    }

    async logQuest(user, questId, questDescription, questDificulty, community, partyId, partyName) {
        await this.log("quests", {
            username: user.username,
            userId: user.id,
            questId: questId,
            questDescription: questDescription,
            questDificulty: questDificulty,
            community: community,
            partyId: partyId,
            partyName: partyName
        })
    }

    async logPostcard(user, recipient, postcardId) {
        await this.log("postcards", {
            username: user.username,
            userId: user.id,
            recipientId: recipient,
            postcardId: postcardId
        })
    }

    async logPuffles(user, puffleId, puffleType, puffleName, action) {
        await this.log("puffles", {
            username: user.username,
            userId: user.id,
            puffleId: puffleId,
            puffleType: puffleType,
            puffleName: puffleName,
            action: action
        })
    }

    async logCoins(user, type, amount, stampMultiplier, giftingUser) {
        const logData = {
            username: user.username,
            userId: user.id,
            type: type,
            amount: amount,
            stampMultiplier: stampMultiplier,
        };
    
        if (giftingUser) {
            logData.giftedByUsername = giftingUser.username;
            logData.giftedById = giftingUser.id;
        }
    
        await this.log("coins", logData);
    }

    async logJitsu(winner, loser, time) {
        await this.log("jitsu", {
            winnerUsername: winner.username,
            winnerId: winner.id,
            loserUsername: loser.username,
            loserId: loser.id,
            winnerRank: winner.dataValues.ninja_belt,
            loserRank: loser.dataValues.ninja_belt,
            time: time
        })
    }

    async logMod(user, action, recipientId, recipientUsername) {
        await this.log("mods", {
            username: user.username,
            userId: user.id,
            action: action,
            recipientUsername: recipientUsername,
            recipientId: recipientId
        })
    }

    async iglooEditLog(user, time) {
        await this.log("iglooedit", {
            username: user.username,
            userId: user.id,
            time: time
        })
    }

    async newsLog(user, issue, time) {
        await this.log("newspaper", {
            username: user.username,
            userId: user.id,
            issue: issue,
            time: time
        })
    }
}
