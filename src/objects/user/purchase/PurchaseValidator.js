import { isNumber } from '@utils/validation'


export default class PurchaseValidator {

    constructor(user, discord) {
        this.user = user
        this.discord = discord;

        this.vipMerch = {
            1: {
                key: 380534,
                items: [28, 380540, 380528],
                furnitures: [12187]
            },
            2: {
                key: 380533,
                items: [26, 380525],
                furnitures: [12188]
            },
            3: {
                key: 380532,
                items: [27, 380529],
                furnitures: [12189]
            },
            4: {
                key: 380535,
                items: [29, 380522, 380531],
                furnitures: [12190]
            }
        }
    }

    get crumbs() {
        return this.user.crumbs
    }

    getInventoryForPurchaseType(type) {
        let inventory = [];

        switch(type) {
            case 'items':
                inventory = this.user.inventory;
                break;
            case 'ticketitems':
                inventory = this.user.inventory;
                break; 
            case 'igloos':
                inventory = this.user.igloos;
                break;
            case 'floorings':
                inventory = this.user.flooring;
                break;
            case 'music':
                inventory = this.user.music;
                break;
            case 'locations':
                inventory = this.user.locations;
                break
            default:
                inventory = [];
        }

        return inventory;
    }

    item(id) {
        return this.validate(id, 'items', this.getInventoryForPurchaseType('items'))
    }

    ticketItem(id) {
        return this.validate(id, 'ticketitems', this.getInventoryForPurchaseType('ticketitems'))
    }

    igloo(id) {
        return this.validate(id, 'igloos', this.getInventoryForPurchaseType('igloos'))
    }

    furniture(id,amount) {
        return this.validate(id, 'furnitures', [], amount)
    }

    flooring(id) {
        return this.validate(id, 'floorings', this.getInventoryForPurchaseType('floorings'))
    }

    music(id) {
        return this.validate(id, 'music', this.getInventoryForPurchaseType('music'))
    }

    location(id) {
        return this.validate(id, 'locations', this.getInventoryForPurchaseType('locations'))
    }

    puffle(id) {
        return this.validate(id, 'puffles')
    }

    puffleItem(id) {
        return this.validate(id, 'puffleitems')
    }

    validateVIPMerch(itemId, type) {
        if(this.user.rank > 4) return true
        let item = this.crumbs.items[itemId]
        for (let [concertId, path] of Object.entries(this.vipMerch)) {
            // Is user trying to illegally obtain the bg?
            let bg = this.vipMerch[concertId].key
            if(itemId == bg && (!this.user.handler.plugins.plugins.party.activeConcert || this.user.handler.plugins.plugins.party.activeConcert.id !== parseInt(concertId))) {
                this.user.send('error', { error: 'A concert is not happening right now, you cannot obtain this item.' })
                this.discord.illegalVipAlert(this.user.username, item, true)
                return false
            }

            // Is user trying to illegally obtain merch without the bg?
            let items = []
            if(type == "items") items = path.items
            if(type == "furnitures") items = path.furnitures

            if (items.includes(itemId) && !this.user.inventory.includes(path.key)) {
                this.user.send('error', { error: 'You don\'t have the background to unlock this item.' })
                this.discord.illegalVipAlert(this.user.username, item)
                return false
            }
        }
        return true
    }

    async validateGemPurchase(itemId, type, inventory, amount = 1) {
        itemId = parseInt(itemId)

        if (!isNumber(itemId)) {
            return false
        }

        const item = this.crumbs[type]?.[itemId];

        if (!item) {
            return false;
        }

        inventory = inventory ?? this.getInventoryForPurchaseType(type);

        const isVoyagerVisit = this.crumbs.voyager.visit.active;
        const itemVoyagerTier = Object.values(this.crumbs.voyager.tiers).find(tier => tier[type]?.includes(itemId));
        const isGemPurchasable = item.gems || (isVoyagerVisit && itemVoyagerTier);
        
        if (!isGemPurchasable) {
            this.user.send('error', { error: 'This item cannot be purchased with gems.' });
            return false;

        } else if (inventory.includes(itemId)) {
            this.user.send('error', { error: 'You already have this item.' });
            return false;
        }

        // check if voyager item and available in rolled items
        if (itemVoyagerTier) {
            const isRolled = (await this.user.handler.db.getVoyagerItems(this.user.id)).includes(itemId);

            // possible cheater
            if (!isRolled) {
                this.user.send('error', { error: 'This item is not currently available.' });
                return false;
            }

            item.gem_cost = itemVoyagerTier.gem_cost;
        }

        const hasEnoughGems = item.gem_cost <= this.user.gems 
            || (type == 'furnitures' && (Math.floor(item.gem_cost * amount)) <= this.user.gems);

        if (!hasEnoughGems) {
            this.user.send('error', { error: 'You need more gems to purchase this item.' });
            return false;
        }

        return item;
    }

    validate(id, type, includes = [], amount) {
        id = parseInt(id)

        if (!isNumber(id)) {
            return false
        }

        let item = this.crumbs[type == 'ticketitems' ? 'items' : type][id]

        if (item && item.party_coins) {
            this.user.checkPartyCoinsReset(true, true)
        }

        if (!item) {
            return false
            
        /*} else if (type == 'ticketitems' && item.ticket_cost > this.db.getUserTickets(this.user.id)) {
            this.user.send('error', { error: 'You need more tickets to redeem this prize.' })
            return false*/

        } else if (item.party_coins && (item.cost > this.user.dataValues.partyCoins || (type == 'furnitures' && (Math.floor(item.cost * amount)) > this.user.dataValues.partyCoins))) {
            //handle purchasing furniture with party coins
            this.user.send('error', { error: 'You need more tickets.' })
            return false

        } else if (this._isGemPurchasable(id, item, type)) { // needs to be purchased through gemValidator flow
            this.user.send('error', { error: 'This item is not currently available.' })
            return false

        } else if ((item.cost > this.user.coins && !item.party_coins) || (type == 'furnitures' && !item.party_coins && (Math.floor(item.cost * amount)) > this.user.coins)) {
            this.user.send('error', { error: 'You need more coins.' })
            return false

        } else if (includes.includes(id)) {
            this.user.send('error', { error: 'You already have this item.' })
            return false

        } else if ((parseInt(item.start || null) * 1000) >= Date.now()) {
            this.user.send('error', { error: 'This item is not currently available.' })
            this.discord.shopAlert(this.user, item, true)
            return false
        } else if (!item.store && !item.island_available && ['igloos', 'locations', 'furnitures', 'floorings', 'music'].includes(type)) {
            this.user.send('error', { error: 'This item is not currently available.' })
            this.discord.shopAlert(this.user, item)
            this.checkBait(item)
            return false
        /*} else if (!this.validateVIPMerch(id, type)) {
            return false*/
            
        } else if (!item.active && !['igloos', 'locations', 'furnitures', 'floorings', 'music'].includes(type)) {
            this.user.send('error', { error: 'This item is not currently available.' });
            this.discord.shopAlert(this.user, item);
            this.checkBait(item)
            return false;
        } else if (item.patched && !['igloos', 'locations', 'furnitures', 'floorings', 'music'].includes(type)) {
            this.user.send('error', { error: 'This item is not currently available.' });
            return false;
        } else {
            return item
        }
    }

    async checkBait(item) {
        if(item.bait && !item.active && this.user.rank < 2) {

            let date = new Date()
            let expiry = date.getTime() + 315536400000
            await this.user.handler.db.ban(this.user.id, expiry, this.user.id, true, 'Attempted Game Manipulation')
    
            this.user.send('close_with_error', {error: `You have been banned forever. Please make sure to follow the CPJ rules.\n(Attempted Game Manipulation)`})
            await this.user.close()
    
            this.discord.banLog(`${this.user.username} has been **automatically banned** for attempting to obtain a bait item (**${item.name}**)`,true) 

        }
    }

    _isGemPurchasable(itemId, item, type) {
        const isVoyagerVisit = this.crumbs.voyager.visit.active;
        const itemVoyagerTier = Object.values(this.crumbs.voyager.tiers).find(tier => tier[type]?.includes(itemId));

        return item.gems || (isVoyagerVisit && itemVoyagerTier);
    }
}
