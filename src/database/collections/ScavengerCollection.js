import Collection from '../Collection'


export default class ScavengerCollection extends Collection {

    constructor(user, models) {
        super(user, models, 'scavengerItems', 'item')
    }

    collect(models) {
        for (let model of models) {
            if(model.hunt == this.handler.crumbs.scavenger.hunt_id) this.collection[model[this.indexKey]] = model
        }
    }

    get collectedItems() {
        return Object.keys(this.collection).map(x => parseInt(x))
    }

    add(item) {
        if (!this.includes(item)) {
            super.add({ userId: this.user.id, item: item, hunt: this.handler.crumbs.scavenger.hunt_id }, () => {
                this.sendScavengerResult()

                if(this.collectedItems.length >= this.handler.crumbs.scavenger.item_count) this.user.addStamp(188)
            })
        }

        return true
    }

    sendScavengerResult() {
        this.user.send('scavenger_result', { items: this.collectedItems })
    }

}
