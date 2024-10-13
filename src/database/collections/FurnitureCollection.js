import Collection from '../Collection'


export default class FurnitureCollection extends Collection {

    constructor(user, models) {
        super(user, models, 'furnitureInventories', 'itemId')
    }

    get furnitures() {
        return this.handler.crumbs.furnitures
    }

    getQuantity(item) {
        return this.collection[item].quantity
    }

    add(item,amount = 1) {
        if (this.includes(item)) {
            let quantity = this.getQuantity(item)
            let maxQuantity = this.furnitures[item].max

            // Maxed quantity
            if (quantity >= maxQuantity) {
                this.user.send('error', { error: `Sorry, you can only buy this item ${maxQuantity} total time${maxQuantity > 1 ? "s" : ""}.` })
                return false
            }

            // Check if the amount would exceed 99 when added
            if ((quantity + amount) > maxQuantity) {
                let amountLeft = maxQuantity - (quantity)
                this.user.send('error', { error: `Sorry, you can only buy a maximum of ${amountLeft} more ${amountLeft == 1 ? 'unit' : 'units'} for this item.` })
                return false
            }

            if(amount < 100 && amount > 0) {
                this.collection[item].increment({ quantity: amount })
                this.collection[item].quantity += amount
            } else {
                return false
            }
        
        } else {
            // New item
            if(amount < 100 && amount > 0) {
                super.add({ userId: this.user.id, itemId: item, quantity: amount })
            } else {
                return false
            }
        }

        return true
    }

    toJSON() {
        let furniture = {}

        for (let f in this.collection) {
            furniture[f] = this.collection[f].quantity
        }

        return furniture
    }

}
