import BaseWaddle from "./waddle/BaseWaddle"

export default class Room {

    constructor(data, handler) {
        Object.assign(this, data)

        this.users = {}
        this.allUsers = {}
        this.jobRequests = {}

        this.tables = {}

        // populated in gamehandler by reading from waddles.json
        this.waddles = {}

        this.handler = handler

        this.blobCheckQueued = false

        setInterval(() => this.checkStamps(this.handler.crumbs), 1000);

        // Object for checking stamp 713 for jobs
        if(Object.keys(this.handler.crumbs.penguins_work).includes(this.id.toString())) this.canSmile = {}

        // remove after xmas 2023 party
        //this.presents = {}
    }

    // remove after xmas 2023 party
    /*addPresent(userId, user) {
        if (this.presents[userId]) return
        
        this.presents[userId] = {
            timestamp: Date.now(),
            claimed: false,
            timeout: setTimeout(()=>{
                this.removePresent(userId, user)
            }, 90000), // remove presents after 3 mins if not already claimed
            sent: false
        }

        user.send("add_present", {room: this.id})
        user.send("enable_present_notif")
    }

    removePresent(userId, user) {
        clearTimeout(this.presents[userId].timeout)
        delete this.presents[userId]
        user.send("delete_present", {room: this.id})
        user.send("disable_present_notif")
    }*/

    get allUserValues() {
        return Object.values(this.allUsers)
    }

    get userValues() {
        return Object.values(this.users)
    }

    get mascotValues() {
        return this.userValues.filter(obj => {return obj.mascot})
    }

    get population() {
        return Object.keys(this.users).length
    }

    get allPopulation() {
        return Object.keys(this.allUsers).length
    }

    get isFull() {
        if (this.game) return false
        
        return this.population >= this.maxUsers
    }

    add(user) {
        if(!user.isInvisible && !this.solo) this.users[user.socket.id] = user
        this.allUsers[user.socket.id] = user

        if (this.game) {
            return user.send('join_game_room', { game: this.id })
        }

        this.fixWelcomeRoomBlob()

        // Get invisible users and add them to obj, only if client is rank 2+
        let obj = { room: this.id, users: user.isInvisible ? this.allUserValues : this.solo ? [user] : this.userValues }
        let apObj = { user: user }
        if(user.rank >= 4) {
            obj.invisible = []
            for(let u of Object.values(this.allUsers)) {
                if(u.isInvisible) obj.invisible.push(u.id)
            }
            if(user.isInvisible) apObj.invisible = true
        }
        
        user.send('join_room', obj)
        this.send(user, 'add_player', apObj)

        if (user?.finishedGGGame === true && this.gg) {
            setTimeout(() => {
                if (user && user.finishedGGGame === true) user.finishedGGGame = false;
            }, 10000);
        } else if (user?.finishedGGGame === true && !this.gg) {
            user.finishedGGGame = false;
        }
    }

    remove(user) {
        this.partialRemove(user)
        delete this.allUsers[user.socket.id]
        this.cleanupJobRequests(user)
    }

    partialRemove(user) {
        if (!this.game) {
            if (user?.wasInvisible) { // fix: issue allowing users to see when mods go uninvis
                this.send(user, 'remove_player', { user: user.id }, [user], false, true)
            } else {
                this.send(user, 'remove_player', { user: user.id })
            }
        }

        if (this.matchmaker && this.matchmaker.includes(user)) {
            this.matchmaker.remove(user)
        }

        delete this.users[user.socket.id]
        this.cleanupJobRequests(user)
    }

    cleanupJobRequests(user) {
        // Remove any job requests made by this user
        if (this.jobRequests[user.id]) {
            delete this.jobRequests[user.id]
        }

        // Remove this user from any other user's job requests
        for (let requesterId in this.jobRequests) {
            if (this.jobRequests[requesterId].requestedUsers.has(user.id)) {
                this.jobRequests[requesterId].requestedUsers.delete(user.id)
                this.jobRequests[requesterId].count--

                // If no more requested users, remove the entire job request
                if (this.jobRequests[requesterId].requestedUsers.size === 0) {
                    delete this.jobRequests[requesterId]
                }
            }
        }

        // Clear the workRequested property for any user that was requested by the leaving user
        for (let otherUser of this.userValues) {
            if (otherUser.workRequested === user.id) {
                otherUser.workRequested = null
            }
        }
    }

    checkStamps(crumbs) {
        if(this.population < 5) return

        for(let [stamp, stampInfo] of Object.entries(crumbs?.stamps_activity?.groupStamps)) {
            let userGroups = {}
            for(let user of this.userValues) {
                if(user.meetsStampConditions(stampInfo.conditions)) {
                    let condition = stampInfo.matching ? user[stampInfo.matching] : "main"
                    if (stampInfo.matchingAll) {
                        condition = ""
                        for (let subCondition of stampInfo.matchingAll) {
                            condition += `${subCondition}${user[subCondition]}`
                        }
                    }

                    if(!userGroups[condition]) userGroups[condition] = []
                    userGroups[condition].push(user)
                }
            }

            for(let group of Object.values(userGroups)) {
                if(group.length >= stampInfo.penguins) for(let user of group) user.addStamp(stamp)
            }
        }
    }

    fixWelcomeRoomBlob() {
        // i cant figure out the issue and this is an ugly hack
        // but it should in theory fix it to the point where our users
        // wont notice it

        if(this.lastBlobCheck && new Date() - this.lastBlobCheck < 120000) {
            if(this.blobCheckQueued) return;
            
            this.blobCheckQueued = true;
        
            setTimeout(() => {
                this.fixWelcomeRoomBlob();
            }, 120000);
        
            return;
        }
        
        this.lastBlobCheck = new Date();
        this.blobCheckQueued = false;

        for(let user of this.userValues) {
            if (user.id && ( !(user.id in this.handler.usersById) || this.handler.usersById[user.id].room.id != this.id ) ) {
                this.remove(user)

                // potential cj fix
                try {
                    if (user?.CJGame) user.CJGame.forceEndGame("Service Error")                    
                    if (user?.waddle && user.waddle instanceof BaseWaddle) waddle.reset()
                } catch {
                    // pass
                }
            }
        }
    }

    checkJobEmote(emoteId, userId, x, y) {
        const roomIdString = this.id.toString();
        if (!Object.keys(this.handler.crumbs.penguins_work).includes(roomIdString)) return;

        let conditions = this.handler.crumbs.penguins_work[roomIdString];

        // Check stamp 713
        const smileEmotes = [1,2,39]
        if(smileEmotes.includes(emoteId)) {
            for(let [workerId,arr] of Object.entries(this.canSmile)) {
                if(arr.includes(userId)) {
                    let worker = this.handler.usersById[workerId]
                    if(!worker) continue
                    worker.workFulfillments.smilingPenguins++
                    this.canSmile[workerId] = this.canSmile[workerId].filter(_id => _id !== userId)
                    if(this.canSmile[workerId].length < 1) delete this.canSmile[workerId]
                    if(worker.workFulfillments.smilingPenguins >= 5 && !worker.stamps.includes(713)) worker.addStamp(713)
                    return
                }
            }
        }

        if (emoteId !== conditions.emote) return;

        const requester = Object.values(this.users).find(u => u.id === userId);
        if (!requester || requester.checkStampWearing(conditions.wearing)) return console.log('invalid requester womp');

        const pickupX = conditions.pickup.x;
        const pickupY = conditions.pickup.y;
        const distanceFromPickup = Math.sqrt(Math.pow(x - pickupX, 2) + Math.pow(y - pickupY, 2));
    
        // Check if the distance is at least 400 pixels
        const pickupDistances = {
            110: 150,
            330: 150
        }
        if (distanceFromPickup < (pickupDistances[this.id] ?? 400)) return console.log('distance check womp womp');

        // Start da jobs
        if (!this.jobRequests[userId]) {
            this.jobRequests[userId] = {
                count: 0,
                requestedUsers: new Set()
            };
        }

        for (let user of this.userValues) {
            if (user.checkStampWearing(conditions.wearing) && !user.workRequested && !this.jobRequests[userId].requestedUsers.has(user.id)) {
                // Check if the requesting penguin has already reached 5 requests
                if (user?.jobCooldown) {
                    continue;
                }
                if (this.jobRequests[userId].count < 5) {
                    user.workRequested = userId;
                    user.send('work_request', {x: x, y: y});
                    this.jobRequests[userId].requestedUsers.add(user.id);
                    this.jobRequests[userId].count++;
                }
            }
        }
    }

    checkpopcornPenguins() {
        // let popcornPenguins = [...new Set(this.popcornPenguins)]
        // if (popcornPenguins.length > 19) {
        //     for (let user of this.allUserValues) {
        //         if (!user || !user.dataValues) continue;
        //         let userId = user.dataValues.id;
        //         if (popcornPenguins.includes(userId)) user.addQuest(14)
        //     }
        // }
    }

    /**
     * Sends a packet to all users in the room, by default the client is excluded.
     *
     * @param {User} user - Client User object
     * @param {string} action - Packet name
     * @param {object} args - Packet arguments
     * @param {Array} filter - Users to exclude
     * @param {boolean} checkIgnore - Whether or not to exclude users who have user added to their ignore list
     */
    send(user, action, args = {}, filter = [user], checkIgnore = false, modonly = false) {
        if (user) {
            user.checkIndividualStamps();
        }

        let users = this.allUserValues.filter(u => !filter.includes(u));
        for (let u of users) {
            if (user && user.isInvisible && !u.isInvisible && !(user.rank >= 4 && u.rank >= 4)) continue; // Allow staff to see each other if they are invisible
            if (this.solo && u.id !== user.id) continue;

            if (checkIgnore && u.ignores.includes(user.id)) {
                continue;
            }

            if (modonly) {
                if (u.rank < 2 || u.streamer) {
                    continue;
                }

                if (!args.muted && !args.modChat) {
                    args.filtered = true;
                }
            }

            u.send(action, args);
        }
    }

}
