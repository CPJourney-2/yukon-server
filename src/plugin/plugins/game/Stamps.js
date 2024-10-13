import GamePlugin from '@plugin/GamePlugin'


export default class Stamps extends GamePlugin {

    constructor(handler) {
        super(handler)

        this.events = {
            'get_stamps': this.getStamps,
            'collect_stamp': this.collectStamp,
            'update_stampbook': this.updateStampbook
        }

    }

    addStamp(stamp, user, flash = false) {
        user.addStamp(stamp,flash)
    }

    collectStamp(args, user) {
        if(this.crumbs.stamps_activity.clientSide.includes(args.stamp) || this.plugins.party.stampValid(args.stamp)) {
            this.addStamp(args.stamp, user)
        } else {
            // Game Stamps
            if(!user.room.stampGroup) return
            if(!(user.room.stampGroup in this.crumbs.stamps)) return
            if(!(args.stamp in this.crumbs.stamps[user.room.stampGroup].stamps)) return
            this.addStamp(args.stamp, user)
        }
        
    }

    async updateStampbook(args, user) {
        //todo: enforce maximums
        let stamps = []
        user.stampbook.update({"colour": args.stampbookInfo.colour, "clasp": args.stampbookInfo.clasp, "highlight": args.stampbookInfo.highlight, "pattern": args.stampbookInfo.pattern})

        await this.db.stampbookStamps.destroy({ where: { userId: user.id } })

        for (let item of args.coverStamps) {
            if(!item.stampId) item.stampId = 0
            let id = item.stampId
            let itemId = item.itemId
            let stampCanGoThrough = user.stamps.includes(id) || (!id && user.inventory.includes(itemId))
            if (!item || !stampCanGoThrough) {
                continue
            }

            stamps.push({ ...item, userId: user.id })
        }

        await this.db.stampbookStamps.bulkCreate(stamps)
    }

    async getStamps(args, user) {
        //todo: check if self or friended

        let stamps = user.stamps
        let userinfo = user
        let unseen = []
        let inventory = Object.keys(user.inventory.collection)
        if(args.userId) {
            stamps = Object.values(await this.db.getStamps(args.userId)).map(e => e.stampId)
            userinfo = await this.db.getStampbook(args.userId)
            inventory = Object.values(await this.db.getInventory(args.userId)).map(e => e.itemId)
        } else {
            unseen = user.stamps.unseen.map(e => e.stampId)
            user.stamps.markAllAsSeen()
        }  

        let username = userinfo.displayName
        let color = userinfo.color
        let stampbook = userinfo.stampbook
        let coverStamps = await this.db.getStampbookStamps(userinfo.id)

        let filteredInventory = []
        let coverOnlyStamps = []
        for(let item of inventory) {
            if(this.crumbs.items[item]?.pin) filteredInventory.push(item)
            if(this.crumbs.items[item]?.stamp_cover) coverOnlyStamps.push(item)
        }
        filteredInventory.sort(
            (a, b) => {
                if(this.crumbs.items[a].pin < this.crumbs.items[b].pin) return -1
                if(this.crumbs.items[a].pin > this.crumbs.items[b].pin) return 1
                return 0
            }
        )

        user.send('stamps_result', { stamps: stamps, inventory: filteredInventory, coverOnly: coverOnlyStamps, unseen: unseen, username: username, playerColor: color, stampbook: stampbook, coverStamps: coverStamps })
    }

}
