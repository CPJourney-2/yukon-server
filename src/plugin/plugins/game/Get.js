import GamePlugin from '@plugin/GamePlugin';

import { hasProps, isNumber } from '@utils/validation';

export default class Get extends GamePlugin {
  constructor(handler) {
    super(handler);

    this.events = {
      get_player: this.getPlayer,
      get_mascots: this.getMascots,
      //get_tickets: this.getTickets,
    };
  }

  async getPlayer(args, user) {

    if(args.name && !args.id) {
      args.id = (await this.db.getUserByUsername(args.name)).id
    }

    if (!hasProps(args, 'id')) {
      return;
    }

    if (!isNumber(args.id)) {
      return;
    }

    if (args.id in this.usersById) {
      return user.send('get_player', {
        penguin: this.usersById[args.id].anonymous,
      });
    }

    if (!user.buddies.includes(args.id)) {
      if (user.rank < 2) {
        return;
      }
    }

    let u = await this.db.getUserById(args.id);
    if (u) {
      let walking = u.dataValues.walking;

      if (u.dataValues.walking != 0) {
        let puffleType = await this.db.puffles.findOne({
          where: { id: walking },
          attributes: ['type'],
        });
        if (puffleType) {
          u.walkingPuffleType = puffleType.type;
        };
      }

      let playerInfo = u.anonymous;

      user.send('get_player', { penguin: playerInfo });
    }
  }

  async getMascots(args, user) {
    let mascots = await this.db.getMascots();

    user.send('get_mascots', { mascots: mascots });
  }

  /*async getTickets(args, user) {
    this.db.userTickets
      .findOne({ where: { userId: user.id } })
      .then((userTickets) => {
        if (userTickets) {
          user.send('get_tickets', { tickets: userTickets.tickets });
        } else {
          user.send('get_tickets', { tickets: 0 });
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
  }*/
}
