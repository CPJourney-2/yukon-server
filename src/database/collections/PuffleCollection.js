import Collection from "../Collection"

export default class PuffleCollection extends Collection {
    constructor(user, models) {
        super(user, models, "puffles", "id")
    }

    add(type, name) {
        super.add({ userId: this.user.id, type: type, name: name })

        return true
    }

    getHowManyPuffles() {
        return this.toJSON().length
    }
}
