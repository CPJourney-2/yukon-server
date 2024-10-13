import GamePlugin from '@plugin/GamePlugin'
import { isString } from '@utils/validation'
import { isNumber } from '../../../utils/validation'
import BaseWaddle from '../../../objects/room/waddle/BaseWaddle'

export default class Waddle extends GamePlugin {

    constructor(handler) {
        super(handler)

        this.events = {
            'get_waddles': this.getWaddles,
            'join_waddle': this.joinWaddle,
            'leave_waddle': this.leaveWaddle,
            'get_waddle_info': this.getWaddleInfo
        }
    }

    getWaddleInfo(args, user) {
        if (!user?.waddle) return


        user.send("waddle_info", {users: user.waddle.users})
    }

    getWaddles(args, user) {
        let tables = Object.fromEntries(Object.values(user.room.waddles).map(waddle => {
            let users = waddle.users.map(user => user ? user.displayName : null)

            return [waddle.id, users]
        }))

        user.send('get_waddles', { waddles: tables })
    }

    joinWaddle(args, user) {
        if (!args.waddle) return
        
        if (!isNumber(args.waddle)) {
            return
        }

        let waddle = user.room.waddles[args.waddle]

        if (!waddle) return

        if(waddle instanceof BaseWaddle) {
            waddle.joinWaddle(user)
            return
        }

        if (waddle.notFull && !user.waddle) {
            waddle.add(user)
        }
    }

    leaveWaddle(args, user) {
        let waddle = user.waddle
        if (!waddle) return

        if(waddle instanceof BaseWaddle) {
            if (waddle?.starting) return // prevent players from abusing leaves

            waddle.removeUserFromWaddle(user)
            return
        }

        waddle.remove(user)
    }

}
