import GamePlugin from '@plugin/GamePlugin';

export default class Minigame extends GamePlugin {
  constructor(handler) {
    super(handler);

    this.events = {
      get_game: this.getGame,
      join_game: this.joinGame,
      send_move: this.sendMove,
      game_over: this.gameOver,
    };
  }

  getGame(args, user) {
    if (user.minigameRoom) {
      user.minigameRoom.getGame(args, user);
    }
  }

  joinGame(args, user) {
    if (user.minigameRoom) {
      user.minigameRoom.joinGame(args, user);
    }
  }

  sendMove(args, user) {
    if (user.minigameRoom) {
      user.minigameRoom.sendMove(args, user);
    }
  }

  gameOver(args, user) {
    let bookGames = ['book1', 'book2', 'book3']
    if (user.room.game || user.minigameRoom) {
      if (user.gameOverTriggered) return;
      user.gameOverTriggered = true;

      if (args.coins == null) {
        args.coins = 0;
      }

      if (args.game && bookGames.includes(args.game) && user.joinedRoomTimestamp) {
        const timeSinceJoined = Date.now() - (user.joinedRoomTimestamp * 1000);
        if (timeSinceJoined < 2.25 * 60 * 1000) { // 2.25 minutes in milliseconds
          args.coins = 0; // Set coins earned to 0 if joined less than 2.25 minutes ago
        }
      }

      // Double Coins Weekend
      if (this.crumbs.double_coins.active) args.coins *= 2;

      if (this?.handler?.elasticsearch) {
        let timeInGame = Date.now() - (user.joinedRoomTimestamp * 1000);
        this.handler.elasticsearch.logMinigame(user, args.game, args.coins, this.crumbs.double_coins.active, timeInGame)
      }
      
      user.updateCoins(args.coins, true);
      this.discord.moneyAlert(user, args.coins, user.room.name);
    }
  }

}
