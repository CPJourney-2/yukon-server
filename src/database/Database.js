import fs from 'fs'
import path from 'path'
import Sequelize from 'sequelize'
import Users from './models/Users'
const Op = Sequelize.Op

export default class Database {

    constructor(config) {
        this.sequelize = new Sequelize(
            config.database,
            config.user,
            config.password,
            {
                host: config.host,
                dialect: config.dialect,
                logging: (config.debug) ? console.log : false,
                logQueryParameters: config.logQueryParameters,
                pool: {
                    max: 100,
                    min: 100,
                    acquire: 60000,
                    idle: 10000
                }
            }
        )

        // Used to translate type id to string
        this.slots = [ 'color', 'head', 'face', 'neck', 'body', 'hand', 'feet', 'flag', 'photo', 'award', 'transforms' ]

        this.dir = `${__dirname}/models`

        let models = this.loadModels()
        this.loadAssociations(models)

        this.usernameRegex = /[^ -~]/i
        this.selectorRegex = /[^a-z0-9-]/i

        this.sequelize
            .authenticate()
            .then(() => {
                // Connected
            })
            .catch(error => {
                console.error(`[Database] Unable to connect to the database: ${error}`)
            })
    }

    loadModels() {
        let models = []

        fs.readdirSync(this.dir).forEach(model => {
            let modelImport = require(path.join(this.dir, model)).default
            let modelObject = modelImport.init(this.sequelize, Sequelize)

            let name = model.charAt(0).toLowerCase() + model.slice(1, -3)

            this[name] = modelObject

            models.push(modelObject)
        })

        return models
    }

    loadAssociations(models) {
        for (let model of models) {
            if (model.associate) {
                model.associate(this)
            }
        }
    }

    buildUser() {
        return new this.users({}, { isNewRecord: false })
    }

    async getUserByUsername(username) {
        if (this.usernameRegex.test(username)) {
            return null
        }

        return await this.findOne('users', {
            where: { username: username }
        })
    }

    async getUserById(userId) {
        return await this.findOne('users', {
            where: { id: userId }
        })
    }

    async getUsername(userId) {
        return await this.findOne('users', {
            where: { id: userId },
            attributes: ['username'],
            raw: true

        }, null, (result) => {
            return result.username, result.username_verified
        })
    }

    async searchForUsers(username) {

        let exactMatch = await Users.findOne({
            where: {
                username: username
            }
        })

        let closeMatch = await Users.findAll({
            where: {
                username: {
                    [Op.like]: '%' + username + '%',
                },
            },
        })

        if (!exactMatch) {
            return closeMatch
        } else {
            for (var i = closeMatch.length - 1; i >= 0; i--) {
                if (closeMatch[i].username === exactMatch.username) {
                    closeMatch.splice(i, 1);
                }
            }
            closeMatch.unshift(exactMatch)
            return closeMatch
        }
    }

    async getUserTotal() {
        return Users.count('id')/*await Users.findAll({
            attributes: [
              [Sequelize.fn('MAX', Sequelize.col('id')), 'id']
            ]
        });*/
    }
    
    async changeUsername(userId, newUsername) {

        if (newUsername.length < 4) return false
        if (newUsername.length > 16) return false

        let existingUser = await this.getUserByUsername(newUsername)
        if (existingUser) return false

        Users.update({
            username: newUsername
        }, {
            where: {
                id: userId
            }
        })

        return true
    }

    async getBanCount(userId) {
        return await this.bans.count({
            where: { userId: userId }
        })
    }

    async ban(userId, banDuration, modId, permaBan, message) {
        this.bans.create({
            userId: userId,
            expires: banDuration,
            moderatorId: modId,
            message: message
        })
        if(permaBan) {
            Users.update({
                permaBan: 1
            }, {
                where: {
                    id: userId
                }
            })
        }
    }

    async unban(userId) {
        this.bans.destroy({
            where: {
                userId: userId,
                expires: {
                    [Op.gt]: Date.now()
                }
            }
        })
        Users.update({
            permaBan: 0
        }, {
            where: {
                id: userId
            }
        })
    }

    async mute(userId, muteExpiry, modId, permaMute, message) {
        await this['mutes'].create({
            userId: userId,
            moderatorId: modId,
            expires: permaMute ? '2037-02-05 00:00:00' : muteExpiry ,
            message: message
        });

        if (permaMute) {
            Users.update({
                muted: 1
            }, {
                where: {
                    id: userId
                }
            });
        }
    }

    async unmute(userId) {
        this['mutes'].update({
            expires: Date.now(),
        }, {
            where: {
                userId: userId,
                expires: {
                    [Op.gt]: Date.now()
                }
            }
        });

        Users.update({
            muted: 0
        }, {
            where: {
                id: userId
            }
        });
    }

    async getIgloo(userId) {
        return await this.findOne('igloos', {
            where: { userId: userId },
            raw: true

        }, null, async (result) => {
            // Add furniture to igloo object
            result.furniture = await this.getFurnitures(userId)
            return result
        })
    }

    async getIglooLikes(userId, slotID, likerID=0) {
        // return in newest first
        let rawLikeData = await this.findAll('iglooLikes', {where: {userID: userId, slotID: slotID}, order: [['createdAt', 'DESC']]})
        
        let iglooLikeCount = rawLikeData.length

        let userLikedIgloo = false

        rawLikeData.forEach((user) => {
            if (user.dataValues.likerID == likerID) return userLikedIgloo = true
        })

        // include for when likes show players

        // let iglooData = []

        // for (let i = 0; i < iglooLikeCount; i++) {
        //     let userData = await this.getUserById(rawLikeData[i].dataValues.likerID).then(user => {
        //         let u = {}

        //         if (!user) {
        //             // user was deleted
        //             return u
        //         }

        //         // im so good at coding
        //         u.username = user.username
        //         u.id = user.id
        //         u.head = user.head
        //         u.face = user.face
        //         u.neck = user.neck
        //         u.body = user.body
        //         u.hand = user.hand
        //         u.feet = user.feet
        //         u.color = user.color
        //         u.photo = user.photo
        //         u.flag = user.flag
        //         u.username_verified = user.username_verified

        //         return u
        //     })

        //     iglooData.push(userData) 
        // }

        return [iglooLikeCount, userLikedIgloo]
    }

    async likeUserIgloo(userID, likerID, slotID) {
        let doesIglooLikeExist = await this.findOne('iglooLikes', {where: {userID: userID, likerID: likerID, slotID: slotID}})

        if (doesIglooLikeExist) return

        return await this['iglooLikes'].create({
            userID: userID,
            likerID: likerID,
            slotID: slotID
        })
    }

    async getFurnitures(userId, iglooId) {
        return await this.findAll('furnitures', {
            where: { 
                userId: userId,
                slot: iglooId 
            },
            raw: true

        }, [], (result) => {
            return result.map(({ id, userId, ...furniture }) => furniture)
        })
    }

    async getStampbookStamps(userId) {
        return await this.findAll('stampbookStamps', {
            where: { userId: userId },
            raw: true

        }, [], (result) => {
            return result.map(({ id, userId, ...furniture }) => furniture)
        })
    }

    async getWorldPopulations() {
        return await this.getCrumb('worlds')
    }

    async getUnverifedUsers(userId) {
        return await Users.findAll({
            where: {
                username_verified: "0",
                username_rejected: "0",
            },
        })
    }

    async verifyUser(userID) {
        return await this['users'].update({username_verified: 1, username_rejected: 0}, {where: {id: userID} } )
    }

    async rejectUser(userID) {
        return await this['users'].update({username_rejected: 1, username_verified: 0}, {where: {id: userID} } )
    }

    async isUsernameApproved(username) {
        return await this.findOne('users', {
            where: {username: username, username_verified: 1, username_rejected: 0}
        })
    }

    async isIDApproved(id) {
        return await this.findOne('users', {
            where: {id: id, username_verified: 1}
        })
    }

    async getActiveBan(userId) {
        let bans = await this.findAll('bans', {
            where: {
                userId: userId,
                expires: {
                    [Op.gt]: Date.now()
                }
            },
            order: [['expires', 'DESC']],
            limit: 1
        })
        return bans[0]
        /*for (let x in bans) {
            if (!longestBan || bans[x].expires > longestBan.expires) {
                longestBan = bans[x]
            }
        }
        return longestBan*/
    }

    async getActiveBannedIDs(userIDs) {
        let bans = await this.findAll('bans', {
            where: {
                userId: userIDs,
                expires: {
                    [Op.gt]: Date.now()
                }
            },
            order: [['expires', 'DESC']],
            limit: 1
        });

        const bannedIDs = new Set(bans.map(ban => ban.userId));
        return userIDs.filter(id => bannedIDs.has(id));
    }

    async getAllBans(userId) {
        let bans = await this['bans'].findAll({
            where: {
                userId: userId,
            },
            attributes: ['userId','issued','expires','moderatorId','message'],
            raw: true
        })
        return bans
    }

    async getBanReason(userId) {
        let ban = await this.getActiveBan(userId)
        if (ban) {
            return ban.message
        }
        return null
    }

    async getAllMutes(userId) {
        let mutes = await this['mutes'].findAll({
            where: {
                userId: userId,
            },
            order: [['expires', 'DESC']],
            attributes: ['userId','issued','expires', 'moderatorId', 'message'],
            raw: true
        })
        return mutes
    }

    async getActiveMute(userId) {
        let mutes = await this.findAll('mutes', {
            where: {
                userId: userId,
                expires: {
                    [Op.gt]: Date.now()
                }
            },
            order: [['expires', 'DESC']],
            limit: 1
        });
        return mutes[0];
    }

    async deleteOutfitSlot(userID, slot) {
        return await this['outfits'].destroy({where: {userID: userID, slot: slot}})
    }

    async insertNewSlot(userID, slot, items={}) {
        return await this['outfits'].create({
            userID: userID,
            slot: slot,
            head: items.head,
            face: items.face,
            neck: items.neck,
            body: items.body,
            hand: items.hand,
            feet: items.feet,
            photo: items.photo,
            color: items.color,
            flag: items.flag
        })
    }

    async getAllOutfitSlots(userID) {
        return await this['outfits'].findAll({where: {userID: userID}})
    }

    async getSpecificOutfitSlot(userID, slot) {
        return await this['outfits'].findAll({where: {userID: userID, slot: slot}})
    }

    async getMascots() {
        return await this.findAll('mascots', {
            attributes: ['id', 'name', 'giveaway', 'stamp'],
            raw: true
        })
    }

    async getGiveaway(mascot) {
        return await this.findOne('mascots', {
            where: {
                id: mascot
            },
            attributes: ['giveaway'],
            raw: true
        })
    }

    async getStampbook(userId) {
        return await this.findOne('users', {
            where: {
                id: userId
            },
            include: ["stampbook"]
        })
    }

    async getStamps(userId) {
        return await this.findAll('stamps', {
            where: {
                userId: userId
            },
            attributes: ['stampId'],
            raw: true
        })
    }

    async getInventory(userId) {
        return await this.findAll('inventories', {
            where: {
                userId: userId
            },
            attributes: ['itemId'],
            raw: true
        })
    }

    async insertFingerprint(userID, ip, secret) {
        //storing the same fingerprint multiple times for one user is a waste of space
        var fingerprint = await this.findOne('fingerprints', {where: {userId: userID, ip: ip, secret: secret}})
        if(fingerprint) return fingerprint

        return await this['fingerprints'].create({
            userId: userID,
            ip: ip,
            secret: secret
        })
    }

    async getAlts(userID) {
        var fingerprints = await this.findAll('fingerprints', {where: {userId: userID}})

        var secrets = fingerprints.map(fingerprint => fingerprint.secret)
        var ips = fingerprints.map(fingerprint => fingerprint.ip)

        fingerprints = await this.findAll('fingerprints', {
            where: {
                [Op.or]: [
                    {ip: {[Op.in]: ips}}, 
                    {secret: {[Op.in]: secrets}} 
                ]
            }
        })

        var userIds = fingerprints.map(fingerprint => fingerprint.userId)
        var users = await this.findAll('users', {
            where: {
                id: {[Op.in]: userIds}
            }
        })

        return users
    }

    async getUserIDsForFingerprint(ip, secret) {
        let fingerprints = await this.findAll('fingerprints', {where: {[Op.or]: [{ip: ip}, {secret: secret}]}})
        let userIDs = new Set()

        for(let fingerprint of fingerprints) {
            userIDs.add(fingerprint.userId)
        }

        return userIDs
    }

    async getBannedUsersForFingerprint(ip, secret) {
        let userIDs = await this.getUserIDsForFingerprint(ip, secret)
        return await this.findAll('users', {where: {id: Array.from(userIDs), ipBan: true}})
    }

    async ipBan(userId, discord = null, skip = new Set()) {
        Users.update({
            ipBan: 1,
            permaBan: 1
        }, {
            where: {
                id: userId
            }
        })

        // let alts = await this.getAlts(userId)
        // for(const alt of alts) {
        //     if(alt.ipBan || skip.has(alt.id)) continue

        //     if(discord) discord.banLog(`**${alt.username}** has been automatically IP banned as part of a chain reaction`,false,true)

        //     skip.add(alt.id)
        //     this.ipBan(alt.id, discord, skip)
        // }
    }

    async unbanIP(userId, discord = null, skip = new Set()) {
        Users.update({
            ipBan: 0,
            permaBan: 0
        }, {
            where: {
                id: userId
            }
        })

        let alts = await this.getAlts(userId)
        for(const alt of alts) {
            if((!alt.ipBan) || skip.has(alt.id)) continue

            if(discord) discord.banLog(`**${alt.username}** has been automatically IP UNbanned as part of a chain reaction`,false,true)

            skip.add(alt.id)
            this.unbanIP(alt.id, discord, skip)
        }
    }

    async getAltsPlus(userId, skip = new Set(), users = new Set()) {

        let alts = await this.getAlts(userId)
        for(const alt of alts) {
            if(skip.has(alt.id)) continue

            skip.add(alt.id)
            users.add(alt)
            await this.getAltsPlus(alt.id, skip, users)
        }

        return users
    }

    async getIpBannedUsers() {
        return await this.findAll('users', {where: {ipBan: true}})
    }

    async addFurniture(userID, itemID, quantity) {
        return await this.furnitureInventories.create({
            userId: userID,
            itemId: itemID,
            quantity: quantity
        })  
    }

    async addItem(userID, itemID) {
        return await this['inventories'].create({
            userId: userID,
            itemId: itemID
        })  
    }

    async removeItem(userID, itemID) {
        return await this['inventories'].destroy({where: {userId: userID, itemId: itemID}})
    }

    async addScavengerItem(userID, itemID, hunt) {
        return await this['scavengerItems'].create({
            userId: userID,
            item: itemID,
            hunt: hunt
        })  
    }

    async getScavengerItems(userID, hunt) {
        return await this.findAll('scavengerItems', {where: {userId: userID, hunt: hunt}})
    }

    async buddyAcceptChecks(recipID,senderID) {
        if(recipID == senderID) return false
        let isBuddies = await this.findOne('buddies', {where: {userId: recipID, buddyId: senderID}})
        let isBuddiesReverse = await this.findOne('buddies', {where: {userId: senderID, buddyId: recipID}})
        if(isBuddies && isBuddiesReverse) return false
        let hasRequest = await this.findOne('buddyRequests', {where: {senderId: senderID, recipientId: recipID}})
        if(hasRequest) return false
        let isIgnored = await this.findOne('ignores', {where: {userId: recipID, ignoreId: senderID}})
        if(isIgnored) return false
        return true
    }

    // Buddy favorites (because idk how to get it to work outside of here)
    async isBuddyFavorite(userID,buddyID) {
        return await this.findOne('buddies', {
            where: {userId: userID, buddyId: buddyID, favorite: 1}
        })
    }

    async buddyFavorite(userID,buddyID) {
        let favorite = await this.isBuddyFavorite(userID,buddyID)
        favorite = !favorite ? 1 : 0
        this['buddies'].update({
            favorite: favorite
        }, {
            where: {
                userId: userID,
                buddyId: buddyID
            }
        })
        return favorite
    }

    // Puffles
    async getPuffles(userID) {
        return await this.findAll('puffles', {where: {userId: userID}, attributes: ['id', 'type', 'name']})
    }

    async adoptPuffle(userID, type, name) {
        let puffle = await this['userPuffles'].create({
            userId: userID,
            type: type,
            name: name
        })

        return puffle
    }

    //Igloo contest
    async userIglooContest(userId) {
        Users.update({
            igloo_contest: 1
        }, {
            where: {
                id: userId
            }
        })
    }

    async hasUserSubmittedIglooContest(userId) {
        let i = this.findOne('users', {
            where: {id: userId, igloo_contest: 1}
        })
        if(i) return i
        return false
    }

    async userHasItem(userId,itemId) {
        let i = this.findOne('inventories', {
            where: {userId: userId, itemId: itemId}
        })
        if(i) return i
        return false
    }

    //The Fair
    async getUserTickets(userID) {
        let tickets = await this.findOne('userTickets',{ where: { userId: userID } })
        return tickets.tickets
    }

    async getAllColorVotes() {
        let votes = await Users.findAll({
          group: ['color_vote'],
          attributes: ['color_vote', [Sequelize.fn('COUNT', 'id'), 'amount']],
          raw: true
        })
        
        let votesObj = {}
        for(let vote of votes) {
          votesObj[vote.color_vote] = vote.amount
        }
        return votesObj
    }

    //Coins for change
    async donateToCFC(userId,amount,cooldown,category) {
        //Prevent fraudulant category
        if(isNaN(category) || category < 1 || category > 3) return

        let donations = await this.findOne('userDonations',{ where: { userId: userId } })
        if(!donations) {
            //This is user's first time donating; create new row
            await this['userDonations'].create({
                userId: userId,
                donationTotal: amount,
                donationCooldown: cooldown
            })
        } else {
            await this['userDonations'].update({
                donationTotal: donations.donationTotal += amount,
                donationCooldown: cooldown
            }, {
                where: {
                    userId: userId
                }
            })
        }

        //Update the master count
        let count = await this.findOne('donationMasterCount',{ where: { category: category } })
        await this['donationMasterCount'].update({
            total: count.total += amount
        }, {
            where: {
                category: category
            }
        })
    }

    async getDonationInfo(userId) {
        let i = await this.findOne('userDonations',{ where: { userId: userId } })
        if(i) return i
        return false
    }

    async getIgloos(userId) {
        const igloos = await this.findAll('igloos', {
            where: { userId: userId },
            order: [['slot', 'ASC']],
            raw: true
        });
    
        // Initialize an array with empty objects for slots 0 to 2
        const iglooSlots = [{}, {}, {}];
        
        for (let igloo of igloos) {
            if (igloo.slot >= 0 && igloo.slot <= 2) {
                let [iglooLikes, _] = await this.getIglooLikes(userId, igloo.slot)
                igloo.likes = iglooLikes
                iglooSlots[igloo.slot] = igloo;
            }
        }
    
        return iglooSlots;
    }

    async getIgloo(userId, iglooId) {
        if (iglooId == null) {
            let user = await this.getUserById(userId)
            iglooId = user.igloo_slot
        }

        return await this.findOne(
            'igloos',
            {
                where: {
                    userId: userId,
                    slot: iglooId
                },
                raw: true
            },
            null,
            async (result) => {
                // Add furniture to igloo object
                result.furniture = await this.getFurnitures(userId, iglooId)
                // result.likes = (await this.getIglooLikes(userId, iglooId)).length
                return result
            }
        )
    }

    async getOpenIgloos() {
        try {
            const openIgloos = await this.igloos.findAll({
                where: { locked: 0 },
                include: [{
                    model: this.users,
                    attributes: ['id', 'username', 'username_verified'],
                    include: [{
                        model: this.mascots,
                        as: 'mascot',
                        attributes: ['name'],
                        required: false
                    }]
                }],
                raw: true
            });

            return openIgloos.map(igloo => {
                let displayName;
                const usernameVerified = igloo['user.username_verified'];
                const username = igloo['user.username'];
                const userId = igloo['user.id'];
                const mascotName = igloo['user.mascot.name'];
            
                if (mascotName) {
                    displayName = mascotName;
                } else if (usernameVerified) {
                    displayName = username;
                } else {
                    displayName = `P${userId}`;
                }
            
                return {
                    id: igloo['user.id'],
                    displayName: displayName
                };
            });
        } catch (error) {
            console.error('Error fetching open igloos:', error);
            throw error;
        }
    }

    async isMaintenance() {
        let m = await this.findOne('worlds',{ where: { staffOnly: 1 } })
        if(m) return true
        return false
    }

    // to-do: this is a stupid way to set maintenace, try and set it elsewhere not specific to one world
    async setMaintenance(toggle,id = 'Blizzard') {
        let m = await this.findOne('worlds',{ where: { id: id } })
        if(!m) return

        if(isNaN(toggle) || toggle < 0 || toggle > 1) return
        await this['worlds'].update({
            staffOnly: toggle
        }, {
            where: {
                id: id
            }
        })
    }

    async getUserPartyQuests(user) {
        return await this.findAll(
            "userQuests",
            {
                where: {
                    userId: user,
                },
                attributes: ["questId"],
            },
            [],
            (result) => {
                return result.map((result) => result.questId);
            }
        );
    }

    async getUserSpecificPartyQuests(user, partyId) {
        return await this.findAll(
            "userQuests",
            {
                where: {
                    userId: user,
                    partyId: partyId
                },
                attributes: ["questId"],
            },
            [],
            (result) => {
                return result.map((result) => result.questId);
            }
        );
    }

    async resetVoyagerRecord(userId) {
        let existingRecord = await this.findOne('voyager', {where: {userId: userId}});

        if (!existingRecord) {
            return this['voyager'].create({
                userId,
            });
            
        } else {
            return this['voyager'].update({
                    itemIds: '',
                }, {
                    where: {
                        userId
                    }
                }
            );
        }
    }

    async getVoyagerItems(userId) {
        return this.findOne('voyager', {
                where: {
                    userId: userId
                }
            },
            [],
            (result) => result.itemIds 
                ? result.itemIds.split(';').map(id => parseInt(id)).filter(n => n !== NaN)
                : []
        );
    }

    async setVoyagerItems(userId, itemIds=[]) {
        return this['voyager'].update({
                itemIds: itemIds.join(';')
            }, {
                where: {
                    userId
                }
            }
        );
    }

    async getVoyagerRerolls(userId) {
        return this.findOne('voyager', {
                where: {
                    userId: userId
                }
            },
            0,
            (result) => result.rerolls
        );
    }

    async setVoyagerRerolls(userId, rerollCount) {
        return this['voyager'].update({
                rerolls: rerollCount
            }, {
                where: {
                    userId
                }
            }
        );
    }

    async isGemPackPurchasable(userId) {
        return this.findOne('voyager', {
                where: {
                    userId: userId
                }
            },
            true,
            (result) => !Boolean(result.is_pack_purchased)
        );
    }

    async isGemPackPurchased(userId, packNumber) {
        return this.findOne('voyager', {
                where: {
                    userId: userId
                }
            },
            false,
            (result) => Boolean(result[`pack${packNumber}`])
        );
    }

    async setGemPackPurchased(userId, packNumber) {
        return this['voyager'].update({
                is_pack_purchased: 1,
                [`pack${packNumber}`]: 1,
            }, {
                where: {
                    userId
                }
            }
        );
    }

    /*========== Helper functions ==========*/

    findOne(table, options = {}, emptyReturn = null, callback = null) {
        return this.find('findOne', table, options, emptyReturn, callback)
    }

    findAll(table, options = {}, emptyReturn = null, callback = null) {
        return this.find('findAll', table, options, emptyReturn, callback)
    }

    find(find, table, options, emptyReturn, callback) {
        return this[table][find](options).then((result) => {

            if (callback && result) {
                return callback(result)
            } else if (result) {
                return result
            } else {
                return emptyReturn
            }
        })
    }

    async getCrumb(table) {
        return await this.findAll(table, {
            raw: true

        }, {}, (result) => {
            return this.arrayToObject(result, 'id')
        })
    }

    arrayToObject(array, key, value = null) {
        return array.reduce((obj, item) => {
            // If a value is passed in then the key will be mapped to item[value]
            let result = (value) ? item[value] : item

            obj[item[key]] = result
            delete item[key]

            return obj
        }, {})
    }

}