import GamePlugin from '@plugin/GamePlugin'


import { hasProps, isNumber, isString, isLength, isInRange } from '@utils/validation'


export default class OutfitLoader extends GamePlugin {

    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'save_outfit': this.saveOutfit,
            'delete_slot': this.deleteSlot,
            'get_all_slots': this.getAllSlots,
            'load_slot': this.loadSlot
        }

        this.items = this.crumbs.items
    }

    async _removeItem(args, user) {
        if (!this.db.slots.includes(args.type)) {
            return
        }

        user.setItem(args.type, 0)
    }

    // i dont know how to import things properly lol.
    async _updatePlayer(args, user) {
        let item = this.items[args.item]

        if (!item || item.type == 10 || !user.inventory.includes(args.item)) {
            return
        }


        let slot = this.db.slots[item.type - 1]
        user.setItem(slot, args.item)
    }


    async loadSlot(args, user) {
        if (!hasProps(args, 'slot')) {
            return
        }

        if (!isNumber(args.slot)) {
            return
        }

        if (!isInRange(args.slot, 1, 12)) {
            // there are only 6 available slots
            return
        }

        let outfitSlots = await this.db.getSpecificOutfitSlot(user.id, args.slot)

        if (outfitSlots.length !== 1) {
            return
        }

        let slots = ['head', 'face', 'neck', 'body', 'hand', 'feet', 'photo', 'color', 'flag']
        
        slots.forEach((slot) => {
            this._removeItem({item: user.dataValues[slot], type: slot}, user)
            this._updatePlayer({item: parseInt(outfitSlots[0].dataValues[slot])}, user)
        })
    }

    async getAllSlots(args, user) {
        let outfitSlots = await this.db.getAllOutfitSlots(user.id)

        let data = []

        for (const d in outfitSlots) {
            data[d] = outfitSlots[d].dataValues
        }
        user.send("slot", data)
    }

    async saveOutfit(args, user) {
        if (!hasProps(args, 'slot')) {
            return
        }

        if (!isNumber(args.slot)) {
            return
        }

        if (!isInRange(args.slot, 1, 12)) {
            // there are only 6 available slots
            return
        }

        let items = {}

        let slots = ['head', 'face', 'neck', 'body', 'hand', 'feet', 'photo', 'color', 'flag']
        
        slots.forEach((slot) => {
            items[slot] = user.dataValues[slot]
        })

        await this.db.deleteOutfitSlot(user.id, args.slot)
        await this.db.insertNewSlot(user.id, args.slot, items)

        await this.getAllSlots(args, user)
    }

    async deleteSlot(args, user) {
        if (!hasProps(args, 'slot')) {
            return
        }

        if (!isNumber(args.slot)) {
            return
        }

        if (!isInRange(args.slot, 1, 12)) {
            // there are only 6 available slots
            return
        }

        await this.db.deleteOutfitSlot(user.id, args.slot)

        await this.getAllSlots(args, user)
    }

}
