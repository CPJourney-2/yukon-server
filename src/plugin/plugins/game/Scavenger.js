import GamePlugin from '@plugin/GamePlugin'


export default class Scavenger extends GamePlugin {

    constructor(handler) {
        super(handler)

        this.events = {
            'scavenger_collect': this.scavengerCollect,
            'scavenger_query': this.scavengerQuery
        }

    }

    checkActive(user) {
        if(!this.handler.crumbs.scavenger.active) user.send('error', { error: "Scavenger Hunt has ended." })

        return this.handler.crumbs.scavenger.active
    }

    scavengerCollect(args, user) {
        if(!this.checkActive(user)) return

        user.scavenger.add(args.item)

        return this.scavengerQuery(args, user)
    }

    scavengerQuery(args, user) {
        if(!this.checkActive(user)) return

        user.scavenger.sendScavengerResult()
    }

}
