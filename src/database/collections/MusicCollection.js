import Collection from '../Collection'


export default class MusicCollection extends Collection {

    constructor(user, models) {
        super(user, models, 'musicInventories', 'musicId')
    }

    add(music) {
        super.add({ userId: this.user.id, musicId: music })
    }

}
