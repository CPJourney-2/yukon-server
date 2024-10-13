import GamePlugin from '@plugin/GamePlugin'

import { hasProps, isNumber } from '@utils/validation';


export default class Buddy extends GamePlugin {

    constructor(handler) {
        super(handler)

        this.events = {
            'buddy_request': this.buddyRequest,
            'buddy_accept': this.buddyAccept,
            'buddy_reject': this.buddyReject,
            'buddy_remove': this.buddyRemove,
            'buddy_find': this.buddyFind,
            'buddy_favorite': this.buddyFavorite,
            'buddy_search': this.buddySearch,
            'buddy_request_seen': this.buddyRequestSeen,
            'get_buddy': this.getBuddy
        }
    }

   async buddyRequest(args, user) {
        if (!isNumber(args.id)) return

        //The person getting the request
        let recipient = this.usersById[args.id]
        //let recipient = await this.db.getUserById(args.id)

        //Make sure recipient is not the same as the sender
        if(recipient) {
            if (recipient.id == user.id ||
                recipient.buddyRequests.includes(user.id) ||
                recipient.buddies.includes(user.id) ||
                recipient.ignores.includes(user.id) ||
                recipient.rank == 10) {
                return
            }
        } else {
            //Recipient is not online, check stuff through db
            if (!this.db.buddyAcceptChecks(args.id,user.id)) {
                return
            }
            this.db.buddyRequests.create({ senderId: user.id, recipientId: args.id })
            return
        }

        let username = ''

        username = user.displayName

        recipient.buddyRequests.add(user.id)
        recipient.send('buddy_request', { id: user.id, username: username })
    }

    async buddyAccept(args, user) {
        if (!hasProps(args, 'id')) {
            return
        }

        if (!(user.buddyRequests.includes(args.id))) {
            return
        }

        if (user.buddies && user.buddies.includes(args.id)) {
            return
        }

        if (user.ignores && user.ignores.includes(args.id)) {
            return
        }

        // Destroy request in the db
        await this.db.buddyRequests.destroy({
            where: { senderId: args.id, recipientId: user.id }
        })
        // In-case the other party had sent them a request already
        await this.db.buddyRequests.destroy({
            where: { senderId: user.id, recipientId: args.id }
        })

        let requester = this.usersById[args.id]
        let username

        if (requester) {
            username = requester.displayName
            requester.addBuddy(user.id, user.displayName, true)

        } else {
            requester = await this.db.getUserById(args.id)
            username = requester.displayName
            this.db.buddies.create({ userId: args.id, buddyId: user.id })
        }

        user.addBuddy(args.id, username)
    }

    async buddyReject(args, user) {
        user.buddyRequests.remove(args.id)
        user.send('buddy_reject', { id: args.id })
        //user.buddyRequests = user.buddyRequests.filter(item => item != args.id)
    }

    buddyRemove(args, user) {
        if (!isNumber(args.id)) return

        if (!user.buddies.includes(args.id)) {
            return
        }

        user.removeBuddy(args.id)

        let buddy = this.usersById[args.id]

        if (buddy) {
            buddy.removeBuddy(user.id)
        } else {
            this.db.buddies.destroy({ where: { userId: args.id, buddyId: user.id } })
        }
    }

    buddyFind(args, user) {
        if (!isNumber(args.id)) return

        if (!user.buddies.includes(args.id) && user.rank < 4 || !(args.id in this.usersById)) {
            return
        }

        let buddy = this.usersById[args.id]

        if (!buddy.room || buddy.isInvisible) {
            return
        }

        let result = { find: buddy.room.id }

        if (buddy.room.isIgloo) {
            result.igloo = true
        } else if (buddy.room.game) {
            result.game = true
        }

        user.send('buddy_find', result)
    }

    async buddyFavorite(args, user) {
        if (!hasProps(args, 'id')) {
            return
        }

        if (!user.buddies.includes(args.id)) {
            return
        }

        let result = await this.db.buddyFavorite(user.id,args.id)
        user.send('buddy_favorite', {favorite:result,id:args.id})
    }

    async buddySearch(args, user) {
        let result
        args.search = args.search.toLowerCase();

        if(!args.search || args.search.length === 0) return

        let searchingForPNumbers = args.search[0] == "p" && /^[0-9]+$/.test(args.search.substring(1))

        if(searchingForPNumbers) {
            //Assume player is searching for "P(numbers)", so get user via id
            let playerId = parseInt(args.search.substring(1))

            if(isNaN(playerId)) return user.send('buddy_search',{penguin:false})

            result = await this.db.getUserById(playerId)
        } else {
            result = await this.db.getUserByUsername(args.search)
        }

        if(!result) return user.send('buddy_search',{penguin:false})

        // Stop if result is mascot (rank 10), user searched themself, or is in user's ignores
        if(result.rank > 9 ||
            result.id == user.id ||
            user.ignores.includes(result.id)) return user.send('buddy_search',{penguin:false})

        // Remove sensitive data
        result.loginKey = null
        result.password = null

        // Return display name if unverified
        //if(searchingForPNumbers) {
            if(!await this.db.isUsernameApproved(result.username)) {
                if(searchingForPNumbers) result.username = `P${result.id}`
                else return user.send('buddy_search',{penguin:false})
            } else {
                if(searchingForPNumbers) return user.send('buddy_search',{penguin:false})
            }
        //}

        user.send('buddy_search',{penguin:result})
    }

    buddyRequestSeen(args, user) {
        if (!hasProps(args, 'id')) {
            return
        }

        if (!user.buddyRequests.includes(args.id)) {
            return
        }

        this.db['buddyRequests'].update({
            seen: 1
        }, {
            where: {
                senderId: args.id,
                recipientId: user.id
            }
        })
    }

    async getBuddy(args, user) {
        if (!hasProps(args, 'id')) {
            return;
        }
    
        if (!isNumber(args.id)) {
            return;
        }
    
        let userData = await this.db.getUserById(args.id);
    
        let {
            username,
            cj_belt,
            cj_wins,
            cj_xp,
            coins,
            gems,
            inf_skill_points,
            highest_floor_reached,
            color_vote,
            igloo_contest,
            ipBan,
            joinTime,
            permaBan,
            lastLogin,
            loginKey,
            muted,
            partyCoins,
            password,
            presents_collected,
            trivia_answered,
            rank,
            streamer,
            username_rejected,
            username_verified,
            ...penguin
        } = userData.dataValues;
    
        if (userData) {
            user.send('get_buddy', { id: args.id, penguin: penguin, type: args.type });
        }
    }
}
