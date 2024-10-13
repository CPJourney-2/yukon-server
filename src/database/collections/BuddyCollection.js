import Collection from '../Collection'


export default class BuddyCollection extends Collection {

    constructor(user, models) {
        super(user, models, 'buddies', 'buddyId')

        this.usersById = this.handler.usersById
    }

    add(id) {
        super.add({ userId: this.user.id, buddyId: id })
    }

    isOnline(id) {
        return id in this.usersById
    }

    shouldShowOnline(id) {
        return this.isOnline(id) && !this.usersById[id].isInvisible
    }

    sendOnline(id) {
        let user = this.usersById[id]

        user.send('buddy_online', { id: this.user.id })
    }

    sendOffline() {
        for (let buddy in this.collection) {
            if (this.isOnline(buddy)) {
                let user = this.usersById[buddy]

                user.send('buddy_offline', { id: this.user.id })
            }
        }
    }

    sendOnlineToAll() {
        for (let buddy in this.collection) {
            if (this.isOnline(buddy)) {
                this.sendOnline(buddy)
            }
        }
    }

    toJSON() {
        let buddies = []

        for (let buddy in this.collection) {
            let online = this.shouldShowOnline(buddy)
            let user = this.collection[buddy].user
            let username = ''

            username = user.displayName

            buddies.push({ id: parseInt(buddy), username: username, online: online, favorite: this.collection[buddy].favorite, items: {} })

            if (this.isOnline(buddy)) {
                this.sendOnline(buddy)
            }
        }

        return buddies
    }

}
