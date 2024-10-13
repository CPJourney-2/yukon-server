import Room from './Room'


export default class Igloo extends Room {

    constructor(data, db, iglooIdOffset, handler) {
        super(data, handler)

        this.db = db
        this.iglooIdOffset = iglooIdOffset
        this.handler = handler

        this.isIgloo = true

        this.db.getUserById(this.userId).then(user => {
            this.username = user.username
            this.user = user
            this.slot = user.igloo_slot
        })

        this.getIglooLikeCount()
    }

    get id() {
        return this.userId + this.iglooIdOffset
    }

    add(user) {
        if(!user.isInvisible) this.users[user.socket.id] = user
        this.allUsers[user.socket.id] = user

        user.send('join_igloo', this)
        if(!user.isInvisible) {
            this.send(user, 'add_player', { user: user })
            this.checkIglooStamp()
        }
    }

    checkIglooStamp() {
        let ownerArray = this.allUserValues.filter(user => {return user.id == this.userId})
        if(ownerArray.length < 1) return

        if(this.userValues.length >= 10) ownerArray[0]?.addStamp(17)
        if(this.userValues.length >= 30) ownerArray[0]?.addStamp(28)
    }

    refresh(user, resetPosition = false, skipSending = false) {
        for (let u of this.allUserValues) {
            if(resetPosition) {
                u.x = 0
                u.y = 0
                u.frame = 1
            }
        }
        this.send(user, 'join_igloo', this, [])

        setTimeout(() => {
            if (this.handler.redisPub && !skipSending) {
                this.handler.redisPub.publish(
                    "igloo-refresh",
                    JSON.stringify({origin: this.handler.id, userId: this.user.id, slot: this.slot, reason: "Changed on different server"})
                );
            }
        },5000)
    }

    async update(query) {
        let user = await this.db.getUserById(this.userId);
        this.db.igloos.update(query, { where: { userId: this.userId, slot: user.igloo_slot }})
    }

    async changeIgloo(iglooId, userObj, skipSending = false) {
        let igloo = await this.db.getIgloo(this.userId, iglooId)
        if (!igloo) {
            igloo = (
                await this.db.igloos.create({
                    userId: this.userId,
                    slot: iglooId,
                    type: 1,
                    flooring: 0,
                    music: 0,
                    location: 1,
                    locked: 1,
                    boundaries: 0
                })
            ).dataValues
            igloo.furniture = []
        }
        for (let i in igloo) {
            this[i] = igloo[i]
        }

        let user = await this.db.getUserById(this.userId);
        if (this.locked === 1) {
            this.handler.openIgloos.remove(user);
            if (userObj) {
                userObj.send('igloo_open_status', {status: 0});
            }
        } else if (this.locked === 0) {
            this.handler.openIgloos.add(user, this);
            if (userObj) {
                userObj.send('igloo_open_status', {status: 1});
            }
        }

        if (this.boundaries === 1) {
            if (userObj) {
                userObj.send('igloo_bounds_status', {status: 1});
            }
        } else if (this.boundaries === 0) {
            if (userObj) {
                userObj.send('igloo_bounds_status', {status: 0});
            }
        }

        this.slot = iglooId
        await this.getIglooLikeCount()

        this.refresh(undefined, undefined, skipSending)
    }

    async clearFurniture() {
        let user = await this.db.getUserById(this.userId);
        await this.db.furnitures.destroy({ where: { userId: this.userId, slot: user.igloo_slot } })
        this.furniture = []
    }

    async getIglooLikeCount() {
        let [iglooLikeCount, _] = await this.db.getIglooLikes(this.userId, this.slot)
        this.likes = iglooLikeCount
    }

    toJSON() {
        return {
            igloo: this.userId,
            users: this.userValues,
            type: this.type,
            flooring: this.flooring,
            music: this.music,
            location: this.location,
            furniture: this.furniture
        }
    }

}
