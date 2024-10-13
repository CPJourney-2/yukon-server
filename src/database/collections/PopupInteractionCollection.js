import Collection from '../Collection'


export default class PopupInteractionCollection extends Collection {

    constructor(user, models) {
        super(user, models, 'popupInteractions', 'id')
    }

    add(popupName) {
        super.add({ userId: this.user.id, popupName: popupName })
    }

    get interactionNames() {
        return Object.values(this.collection).map(interaction => interaction.dataValues.popupName);
    }
}
