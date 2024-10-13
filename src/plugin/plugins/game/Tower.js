import GamePlugin from '@plugin/GamePlugin'

import { sql } from 'sequelize'

export default class Tower extends GamePlugin {

    constructor(handler) {
        super(handler)

        this.events = {
            'tower_init': this.init,
            /*'tower_join_joiner': this.joinJoiner,
            'tower_start_game': this.startGame,
            'tower_completed_room': this.completedRoom,
            'tower_reduce_spirit': this.reduceSpirit,
            'tower_end_game': this.endGame,
            'tower_add_treasure': this.addTreasure,
            'get_tower_leaderboard': this.getLeaderboard,*/
        }

    }

    async init(args, user) {
        user.send('error', { error: 'The Infinite Tower is not currently available' })
        //user.tower()
    }

    async joinJoiner(args, user) {
        if(isNaN(args.roomId) || isNaN(args.stairSide)) return
        user.tower().nextRoomID = args.roomId
        user.tower()._floorSide = args.stairSide
        this.plugins.join.joinRoom({ room: 831 }, user)
    }

    async startGame(args, user) {
        user.tower().startGame(args.startOffset)
    }

    async completedRoom(args, user) {
        user.tower().completedRoom(args.room, args.exitSide)
    }

    async reduceSpirit(args, user) {
        user.tower().reduceSpirit()
    }

    async endGame(args, user) {
        user.tower().endGame(args.throughBreakRoom)
    }

    async addTreasure(args, user) {
        user.tower().addTreasure(args.count)
    }

    async getLeaderboard(_, user) {
        let stats = await this.db.sequelize.query(`SELECT id, username, highest_floor_reached, username_verified
        FROM users
        WHERE RANK < 2
        ORDER BY highest_floor_reached DESC
        LIMIT 100`)

        let filtered = []

        // For any that have rejected username, replace the username with P(id)
        for(let i = 0; i < stats[0].length; i++) {
            let _stat = stats[0][i]
            if(!_stat.username_verified) _stat.username = `P${_stat.id}`
            filtered.push({
                username: _stat.username,
                floor: _stat.highest_floor_reached
            })
        }

        user.send('get_tower_leaderboard', {stats: filtered})
    }

}
