import GamePlugin from '@plugin/GamePlugin'

import { hasProps, isInRange } from '@utils/validation'


export default class Actions extends GamePlugin {

    constructor(handler) {
        super(handler)

        this.events = {
            'send_position': this.sendPosition,
            'send_frame': this.sendFrame,
            'snowball': this.snowball,
            'open_sprite': this.openSprite,
            'close_sprite': this.closeSprite,
            'teleport_and_move': this.teleportAndMove,
            'hasjdkfjhawoe': this.openNews,
            'aksjdyfwie': this.closeNews,
        }

        this.validSprites = ['1_1', '1_2', '1_3', '1_4'] // newspaper, map, stampbook, blueprint
    }

    openSprite(args, user) {
        if (user.openSprite != null) this.closeSprite(args, user)

        if (!args.sprite || !this.validSprites.includes(args.sprite) || user.transform > 0) return

        // not in their own iggyloo, don't pull out blueprint
        if (args.sprite == '1_4' && (!user.room.isIgloo || user.room.id != this.config.game.iglooIdOffset + user.id)) return

        user.openSprite = args.sprite
        user.frame = 1
        
        user.room.send(user, 'open_sprite', {id: user.id, sprite: args.sprite}, [])
    }

    closeSprite(_, user) {
        if (user.openSprite == null) return

        user.openSprite = undefined
        user.frame = 1
        
        user.room.send(user, 'close_sprite', {id: user.id}, [])
    }

    sendPosition(args, user) {
        if (!hasProps(args, 'x', 'y')) {
            return
        }

        if (!isInRange(args.x, 0, 1520)) {
            return
        }

        if (!isInRange(args.y, 0, 960)) {
            return
        }

        this.plugins['actions']['events'].close_sprite(args, user)

        user.x = args.x
        user.y = args.y
        user.frame = 1

        user.room.send(user, 'send_position', { id: user.id, x: args.x, y: args.y })
    }

    sendFrame(args, user) {
        if (!hasProps(args, 'frame')) {
            return
        }

        if (!isInRange(args.frame, 1, 26)) {
            return
        }

        if (user.openSprite != null) return

        if (args.set) {
            user.frame = args.frame
        } else {
            user.frame = 1
            user.tempFrame = args.frame
        }

        if (user.dataValues.body == 380006) {
            // snowcat, don't allow dance/wave
            return
        }

        user.room.send(user, 'send_frame', { id: user.id, frame: args.frame, set: args.set })
    }

    snowball(args, user) {
        if (!hasProps(args, 'x', 'y')) {
            return
        }

        if (!isInRange(args.x, 0, 1520)) {
            return
        }

        if (!isInRange(args.y, 0, 960)) {
            return
        }

        user.thrownSnowball = true
        user.room.send(user, 'snowball', { id: user.id, x: args.x, y: args.y })
    }

    async teleportAndMove(args, user) {
        if(args.id == undefined || isNaN(args.id)) return
        let _crumb = this.handler.crumbs.room_teleports[user.room.id]
        if(!_crumb) return
        let crumb = _crumb[args.id]
        if(!crumb) return

        user.x = crumb.xMoveTo ?? crumb.x;
        user.y = crumb.yMoveTo ?? crumb.y;

        // REMOVE AFTER FAIR - only marooned lagoon shouldnt send to client
        const filter = user.room.id === 856 ? [user] : []

        user.room.send(user, 'teleport_and_move', {
            id: user.id,
            x: crumb.x,
            y: crumb.y,
            xMove: crumb.xMoveTo || 0,
            yMove: crumb.yMoveTo || 0
        }, filter)
    }

    openNews(args, user) {
        if (this?.handler?.elasticsearch) {
            if (user) {
                user.newsOpen = Date.now();
                user.issue = args.issue
            }
        }
    }

    closeNews(args, user) {
        if (this?.handler?.elasticsearch) {
            if (user && user.newsOpen && user.issue) {
                let timeInNews = (Date.now() - user.newsOpen) / 1000
                this.handler.elasticsearch.newsLog(user, user.issue, timeInNews)
            }
        }
    }
}
