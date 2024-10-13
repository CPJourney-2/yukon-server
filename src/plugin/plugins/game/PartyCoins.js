import GamePlugin from '@plugin/GamePlugin'

import { isNumber, hasProps } from '@utils/validation';

/*******************************
 * ******************************
 * ******************************
 * ******************************
 * 
 * THIS IS NO LONGER USED!!!!!!!
 * 
 * ******************************
 * ******************************
 * ******************************
 ********************************/

export default class PartyCoins extends GamePlugin {

    constructor(users, rooms) {
        const CURRENCY_NAME = "candy"

        super(users, rooms)
        this.events = {
            //'get_party_coins': this.getPartyCoins,
            //'party_coins_buy': this.partyCoinsBuy
        }

        this.privateEvents = {
            //'update_coins': this.updateCoins
        }

    }

    async getPartyCoins(_, user) {
        user.send('get_party_coins', {partyCoins: user?.dataValues?.partyCoins})
    }

    async partyCoinsBuy(args, user) {

        //FOR PUMPKIN/REINDEER PUFFLE ONLY
        if(args.puffle) {
            if (args.type) {
                if(!isNumber(args.type)) return
                if(args.type != 12) return
            }
            let type = args.type;
            let name = args.name;
            const puffleCrumb = this.crumbs["puffles"][type];

            let price = puffleCrumb.cost
            let itemAvailable = puffleCrumb.active
    
            if (!itemAvailable || !price) return user.send("error", {error: "This puffle is currently not available"})
    
            let userCoinCount = user.dataValues.partyCoins
    
            if (userCoinCount < price) return user.send("error", {error: `You do not have enough cookies to adopt this puffle`})
    
            if(!puffleCrumb) {
                user.send('error', { error: 'Invalid puffle type.' })
                return;
            }
    
            let userPuffleCount = user.puffles.getHowManyPuffles()
    
            if (userPuffleCount >= 30) {
                user.send('error', {error: "You cannot adopt more than 30 puffles"})
                return
            }
    
            let puffleUser = user.puffles.add(type, name);
    
            user.update({partyCoins: userCoinCount - puffleCrumb.cost})
            user.send('adopt_puffle', { puffle: puffleUser.id, coins: user.coins });
            user.send('info', {message: "Your new puffle is now in your igloo.\nEnjoy!"})
            user.send('get_party_coins', {partyCoins: user?.dataValues?.partyCoins})
    
            if (userPuffleCount >= 15) {
                user.addStamp(21);
            }
    
            user.addSystemPostcard(111, name)
            return
        }

        if (!hasProps(args, "item")) return
        if (!isNumber(args.item)) return

        let crumbsItem = this.handler.crumbs.items[args.item.toString()]

        if (!crumbsItem) return

        let price = crumbsItem?.partycoins_price
        let itemAvailable = crumbsItem?.purchasable_with_partycoins

        if (!itemAvailable || !price) return user.send("error", {error: "This item is currently not available"})

        let userCoinCount = user.dataValues.partyCoins

        if (userCoinCount < price) return user.send("error", {error: `You need more cookies to purchase this item.`})

        if (user.inventory.includes(args.item)) return user.send("error", {error: "You already have this item"})

        user.update({partyCoins: userCoinCount - price})
        user.inventory.add(args.item)

        let slot = this.db.slots[crumbsItem.type - 1];

        user.send('add_item', {
            item: args.item,
            name: crumbsItem.name,
            slot: slot,
            coins: user.coins,
            hide: false
          });

          user.send('get_party_coins', {partyCoins: user?.dataValues?.partyCoins})
    }

    // internal function to update coins, call whenever you need to update party coins
    // pass in user object and amount
    // this.handler.plugins.plugins.partycoins.bindedPrivateEvents.update_coins(user, COIN_AMOUNT_TO_ADD )
    async updateCoins(user, amount) {
        if (!isNumber(amount)) return

        let currentCoins = user?.dataValues?.partyCoins

        user.update({partyCoins: currentCoins + amount})
        user.send('get_party_coins', {partyCoins: user?.dataValues?.partyCoins})
    }
}
