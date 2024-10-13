import GamePlugin from '@plugin/GamePlugin';

export default class Item extends GamePlugin {
  constructor(handler) {
    super(handler);

    this.events = {
      update_player: this.updatePlayer,
      add_item: this.addItem,
      remove_item: this.removeItem,
      add_gem_item: this.addGemItem,
      //redeem_tickets: this.redeemTickets,
    };
  }

  updatePlayer(args, user) {
    let item = this.crumbs.items[args.item];

    if (!item || item.type == 10 || item.type == 11 || !user.inventory.includes(args.item)) {
      return;
    }

    if (user.dataValues.body == 380006 || user.dataValues.body == 380291) {
      // dont allow players to update clothing while snowcat/exp penguin costume equipped
      if(item.type > 1 && item.type < 8) return;
    }

    if (item.name == 'Snowcat' || item.name == 'Experimental Penguin Costume') {
      let slots = [
        'head',
        'face',
        'neck',
        'body',
        'hand',
        'feet',
      ];

      slots.forEach((slot) => {
        this.removeItem({ item: user.dataValues[slot], type: slot }, user);
      });
    }

    let slot = this.db.slots[item.type - 1];
    user.setItem(slot, args.item);
  }

  async addItem(args, user) {
    let item = user.validatePurchase.item(args.item);

    if (!item) {
      return;
    }

    let slot = this.db.slots[item.type - 1];
    user.inventory.add(args.item);

    //im a lazy dude
    if (item.name == 'Tour Guide Hat') {
      user.addSystemPostcard(126);
    }

    if (item.name == 'Spy Phone') {
      user.addSystemPostcard(127);
    }

    let obj = {
      item: args.item,
      name: item.name,
      slot: slot,
      hide: args.hide
    }

    if(item.party_coins) {
      user.updatePartyCoins(-item.cost);
      user.send('add_item', {
        ...obj,
        partyCoins: user.partyCoins,
      });
    } else {
      user.updateCoins(-item.cost);
      user.send('add_item', {
        ...obj,
        coins: user.coins,
      });
    }

    if (this?.handler?.elasticsearch) {
      await this.handler.elasticsearch.logItemPurchase(user, "clothing", item.type, args.item, item.name, item.cost)
    }
    return;
  }

  async addPrize(args, user) {
    let type = args.type
    if(!type) type = 'item'
    let item = this.handler.crumbs[`${type}s`][args.item];

    if (!item) {
      return;
    }

    switch(type) {
      case 'igloo':
        user.igloos.add(args.item)
        user.send('add_igloo', { igloo: args.item, coins: user.coins })
        break

      case 'item':
        let slot = this.db.slots[item.type - 1];
        user.inventory.add(args.item);
    
        user.send('add_item', {
          item: args.item,
          name: item.name,
          slot: slot,
          coins: user.coins,
          hide: args.hide
        });
        break
      default: break
    }
    return;
  }

  removeItem(args, user) {
    if (!this.db.slots.includes(args.type)) {
      return;
    }

    user.setItem(args.type, 0);
  }

  async addGemItem(args, user) {
    let item = await user.validatePurchase.validateGemPurchase(args.item, args.type || 'items');

    if (!item) {
      return;
    }

    let slot = this.db.slots[item.type - 1];
    user.inventory.add(args.item);

    await user.updateGems(-item.gem_cost, true);
    user.send('add_gem_item', {
      item: args.item,
      name: item.name,
      slot: slot,
      gems: user.gems,
      hide: args.hide
    });
    return;
  }
  //PROBABLY OBSOLETE SINCE PARTY COINS EXIST
  /*redeemTickets(args, user) {
    let item = user.validatePurchase.ticketItem(args.item);

    if (!item) {
      return
    }

    //Invalid ticket item
    if (!item.ticket_cost) return
    
    this.db.getUserTickets(user.id).then((userTickets) => {
      if (item.ticket_cost > userTickets) {
        user.send('error', { error: 'You do not have enough Tickets to redeem this prize.' });
        return
      }
      console.log('Updating tickets')
      this.db.userTickets
        .update(
          { tickets: userTickets - item.ticket_cost },
          { where: { userId: user.id } }
        )
        .then((ticketsUpdated) => {
          if (ticketsUpdated) {
            console.log('Tickets UPDATED')
            user.send('get_tickets', {
              tickets: userTickets - item.ticket_cost,
            });

            //let item = this.crumbs['items'][args.item];
            let slot = this.db.slots[item.type - 1];

            user.inventory.add(args.item);
            user.send('add_item', {
              item: args.item,
              name: item.name,
              slot: slot,
              coins: user.coins,
            });
          }
        })
        .catch((err) =>
          console.log(
            'Error Fetching Tickets for user: ',
            user.username,
            ' : ',
            err
          )
        );
    })
    /*} else {
      //Can NOT afford.
      user.send('error', {
        error: 'You do not have enough Tickets to redeem this prize.',
      });
    } *\/
    //});
  }*/
}
