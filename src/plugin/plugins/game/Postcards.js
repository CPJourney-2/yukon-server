import GamePlugin from '@plugin/GamePlugin'


export default class Postcards extends GamePlugin {

    constructor(handler) {
        super(handler)

        this.events = {
            'get_postcards': this.getPostcards,
            'send_postcard': this.sendPostcard,
            'remove_postcard': this.removePostcard,
            'remove_postcards': this.removePostcards
        }

    }

    async getPostcards(args, user) {
        let postcards = Object.values(user.postcards.collection).sort((a,b) => {
            return b.date - a.date
        })

        user.send('get_postcards', { postcards: postcards })

        user.postcards.markAllAsSeen()
    }

    /**
     * Sends a postcard to a penguin.
     * @param {Object} args - The arguments for sending the postcard.
     * @param {number} args.userId - The ID of the penguin user.
     * @param {Object} user - The user sending the postcard.
     * @param {boolean} [admin_command=false] - Indicates if the function is called by an admin command.
     */
    async sendPostcard(args, user, admin_command = false) {
        const postcardCost = 10;

        if (!admin_command) {
            if (postcardCost > user.coins) {
                user.send('error', { error: 'You need more coins.' })
                return false
            }
        }

        let recipient = this.usersById[args.userId]

        //TODO: Add rank check for offline recipients
        if(recipient?.rank == 10 && user.dataValues.rank < 2) return

        if (!admin_command) {
            user.updateCoins(-postcardCost)
        }

        if (recipient) {
            if(!recipient.ignores.includes(user.id)) recipient.addPostcard(user, args.cardId)
        } else {
            const isIgnored = await this.db.findOne('ignores', { where: { userId: args.userId, ignoreId: user.id } })
            if(!isIgnored) this.db.postcards.create({ senderId: user.id, recipientId: args.userId, postcardId: args.cardId })
        }

        user.send('send_postcard', {coins: user.coins})

        if (this?.handler?.elasticsearch) {
            await this.handler.elasticsearch.logPostcard(user, args.userId, args.cardId)
        }
    }

    async removePostcard(args, user) {
        user.postcards.remove(args.id)

        return await this.getPostcards(args, user)
    }

    async removePostcards(args, user) {
        user.postcards.removeFromSender(args.sender)

        return await this.getPostcards(args, user)
    }

}
