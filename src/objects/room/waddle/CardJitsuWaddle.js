import BaseWaddle from './BaseWaddle'


export default class CardJitsuWaddle extends BaseWaddle {
    constructor(waddle, room, handler) {
        super(waddle, room, handler)
    }

    joinWaddle(penguin) {
        if (penguin?.CJGame?.ended == false) {
            // user is in a cj game
            return
        }

        if (this.users.length == 2) return

        super.joinWaddle(penguin)
    }

    joinRoom(user) {
        this.send("destroywaddle")

        user.joinRoom(this.handler.rooms["998"], 0, 0)
    }

    onGameStart() {
        this.handler.plugins.plugins.cardjitsu.bindedPrivateEvents.setup(this.users)
        super.onGameStart()

        this.reset()
    }

    onWaddleJoin() {
        // send play anim of ninjas dancing in room
        super.onWaddleJoin()
    }
}
