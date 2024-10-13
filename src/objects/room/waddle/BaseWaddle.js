const AsyncLock = require('async-lock');

export default class BaseWaddle {

    constructor(waddle, room, handler) {
        this.room = room
        this.waddle = waddle
        this.handler = handler
        this.users = []
        this.starting = false

        this.lock = new AsyncLock();
    }

    /*
    rooms contain waddles
    waddles allow to start html5 multiplayer games that reset on start
    they're essentially tables but you reset on join, so a lot of code is shared

    someone will send join_waddle [id] and it'll attempt to join a waddle in that room

    imagine the ski hill with 3 players waiting

    room.waddle = array of waddles

    look at CardJitsuWaddle 4 n example on how2use

    which waddle is used where is defined in WaddleFactory
    */

    joinWaddle(penguin) {
        if (penguin.room.id != this.waddle.roomId) return

        if (this.users.length > this.waddle.seats) return

        if (penguin.waddle != null) {
            return
        }

        if (this.users.length == 2) return

        // somehow prevent race condition

        let self = this

        this.lock.acquire('usersLock', function (done) {
            if (self.users.length == 2) return

            self.users.push({
                id: penguin.id,
                seat: self.users.length,
                user: penguin
            })
            
            penguin.waddle = self

            this.send("update_waddle", {users: self.users})
            penguin.send("join_waddle", {game: self.waddle.game, users: self.users})

            self.onWaddleJoin(penguin)
            // start game if needed
            if (self.users.length == self.waddle.seats) {
                self.starting = true

                setTimeout(() => {
                    self.onGameStart()
                }, 1100)
            }

            done()
          }.bind(this) , function (err) {
        }.bind(this));
    }

    onWaddleJoin(user) {
        // override
    }

    onWaddleLeave(user) {
        // override
    }

    removeUserFromWaddle(user) {
        for (let u of this.users) {
            if (u.id == user.dataValues.id) {
                this.send("waddle_remove",  {users: this.users})

                this.users = this.users.filter(obj => obj.id !== user.id)
        
                user.waddle = null
        
                this.onWaddleLeave(user)
            } 
        }
    }

    onGameStart() {
        let users = this.users
        let handler = this.handler

        this.send("destroywaddle")

        for (let user of users) {
            // todo make this based on id

            user.user.joinRoom(handler.rooms["998"], 0, 0)
        }

        this.starting = false
    }

    reset() {
        // reset waddle
        for (let u of this.users) {
            this.removeUserFromWaddle(u.user)
        }

        this.users = []

    }

    // send message to all players in a waddle
    send(action, args = {}, filter=[]) {
        for (let user in this.users) {
            user = this.users[user]
            if (filter.includes(user.id)) continue
            user = this.handler.usersById[user.id.toString()]

            user?.send(action, args)
        }
    }

    destroy() {
        // todo, for when someone removes cj mat in their iggyloo
    }
}
