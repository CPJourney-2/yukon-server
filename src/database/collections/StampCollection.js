import Collection from '../Collection'


export default class StampCollection extends Collection {

    constructor(user, models) {
        super(user, models, 'stamps', 'stampId')
    }

    add(stamp) {
        super.add({ userId: this.user.id, stampId: stamp })
    }

    get unseen() {
        return Object.values(this.collection).filter(e => {return !e.seen})
    }

    markAllAsSeen() {
        for(let item of this.unseen) {
            item.seen = 1
            item.save()
        }
    }

}
