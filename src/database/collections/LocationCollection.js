import Collection from '../Collection'


export default class LocationCollection extends Collection {

    constructor(user, models) {
        super(user, models, 'locationInventories', 'locationId')
    }

    add(location) {
        super.add({ userId: this.user.id, locationId: location })
    }

}
