import GamePlugin from '@plugin/GamePlugin'


export default class LiveEvent extends GamePlugin {

    constructor(handler) {
        super(handler)

        this.floorFlipped = false
        this.openSesame = false
        this.showStarted = false
        this.showStartStamp = 0

        this.events = {
            'animatronic_live_show': this.animatronicLiveShow,
            'animatronic_background': this.animatronicBackground,
            'query_live_event': this.queryLiveEvent
        }

    }

    async queryLiveEvent(args, user) {
        user.send('query_live_event', {
            'floorFlipped': this.floorFlipped,
            'openSesame': this.openSesame,
            'showStarted': this.showStarted,
            'songOffset': Date.now() - this.showStartStamp
        })
    }

    async animatronicLiveShow(args,user) {
        if (user.dataValues.rank < 6) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
			return
        }

        if (!args?.animation) return

        let anim = args?.animation
        switch(anim) {
            case 1:
                this.floorFlipped = true
                break;
            case 2:
                this.openSesame = true;
                break;
            case 3:
                this.showStarted = true;
                this.showStartStamp = Date.now()
                break;
        }

        user.room.send(user, 'animatronic_live_show', {animation: args?.animation},[], true, false)
    }

    async animatronicBackground(args, user) {
        if (user.dataValues.rank < 6) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
			return
        }
        let item = this.crumbs.items[380153];

        for (let u of Object.values(user.room.users)){
            u.inventory.add(380153);
            u.send('add_item', {
                item: 380153,
                name: "Frankie's Band Giveaway",
                slot: this.db.slots[item.type - 1],
                coins: u.coins,
                hide: false
              });
        }

    }

}
