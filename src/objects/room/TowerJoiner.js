import Room from './Room'

export default class TowerJoiner extends Room {

    constructor(data, handler) {
        super(data, handler)
    }

    add(user) {
        if(!user.isInvisible && !this.solo) this.users[user.socket.id] = user
        this.allUsers[user.socket.id] = user

        //user.tower().generateLevel()
    }

}
