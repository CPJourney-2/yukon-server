import Collection from '../Collection'


export default class FlooringCollection extends Collection {

    constructor(user, models) {
        super(user, models, 'flooringInventories', 'flooringId')
    }

    add(flooring) {
        super.add({ userId: this.user.id, flooringId: flooring })
    }

}
