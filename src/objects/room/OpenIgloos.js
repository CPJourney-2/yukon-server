export default class OpenIgloos {

    constructor() {
        this.list = []
    }

    get flat() {
        return this.list.map(igloo => igloo.id)
    }

    includes(igloo) {
        return this.flat.includes(igloo)
    }

    add(user, igloo=null) {
        if (!this.includes(user.id)) {
            this.list.push({ id: user.id, username: user.displayName, igloo: igloo })
        }
    }

    remove(user) {
        if (this.includes(user.id)) {
            this.list = this.list.filter(igloo => igloo.id != user.id)
        }
    }

    toJSON() {
        return this.list
    }

}
