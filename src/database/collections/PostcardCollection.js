import Collection from '../Collection'


export default class PostcardCollection extends Collection {

    constructor(user, models) {
        super(user, models, 'postcards', 'id')
    }

    add(sender, cardId, extra = null, date = new Date()) {
        super.add({ recipientId: this.user.id, sender: sender, senderId: sender.id, postcardId: cardId, extra: extra, date: date }, (model) => {
            model.sender = sender
            model.date = date;

            this.user.send('receive_postcard', model)
        })
    }

    removeFromSender(senderId) {
        this.model.destroy({ where: { recipientId: this.user.id, senderId: senderId }}).then(() => {
            for(let [key,card] of [...Object.entries(this.collection)]) {
                if(card.senderId == senderId) delete this.collection[key]
            }
            this.user.send('reload_postcards')
        })
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
