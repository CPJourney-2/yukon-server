export default class UserTowerController {
    constructor(user) {
        this.user = user
        this._spirit = 3
        this._treasure = 0
        this.completedRooms = []
        this.lastBreakRoom = 0
        this.floorOffset = 0 // this should be set to 0 in the ctor, it's just higher for debugging rn, so we start at floor whatever
        //this.questionsArray = []
        this.started = false
        this.startTime = undefined

        // ====== FOR JOINER =====
        this._floorSide
        this.nextRoomID
    }

    get floor() {
        return this.completedRooms.length + 1 + this.floorOffset
    }

    get treasure() {
        //this value should be modified through the functions below
        //to prevent client-server desync
        return this._treasure
    }

    get spirit() {
        //this value should be modified through the functions below
        //to prevent client-server desync
        return this._spirit
    }

    get breakRoomCount() {
        return this.completedRooms.filter(room => room === "break").length
    }

    startGame(startOffset = 0) {
        if(this.started) {
            this.user.send('error', { error: 'Internal error: Tower already started.' })
            return
        }
        this.started = true
        this.startTime = Date.now()
        this.floorOffset = startOffset
    }

    completedRoom(room, exitSide) {
        this.completedRooms.push(room)
    }

    reduceSpirit() {
        this._spirit--
        if(this.spirit < 0) {
            this.possibleCheater("Spirit reduced below 0")
        }

        this.floorOffset -= Math.min(Math.ceil(this.floor / 30), 10)
        if(this.floor < 1) this.floorOffset += 1 - this.floor

        this.playedSpiritAnimation = false
    }

    endGame(throughBreakRoom) {
        if(this.user.room.id !== 832 && throughBreakRoom) {
            this.possibleCheater("Exited through break room without actually being there")
        }
        this.user.currentTower = null
        if(!this.started) {
            return
        }

        let moneyAward = this.treasure
        if(!throughBreakRoom) moneyAward = Math.floor(moneyAward / 2)

        setTimeout(() => {
            this.user.updateCoins(moneyAward, true, "partytowerjoiner")
            if(moneyAward >= 1000) this.user.handler.plugins.plugins.party.questComplete({questId:42},this.user)
        })

        this.user.handler.discord.legalTower(`**${this.user.username}** completed the tower with **${this.treasure}** treasure. Went through ${this.completedRooms.length} floors... Ended at floor ${this.floor}... They started at <t:${Math.floor(this.startTime / 1000)}:T>.`)
    }

    addTreasure(count) {
        this._treasure += count
    }

    possibleCheater(text) {
        this.user.handler.discord.illegalTower(`${this.user.username} possibly **cheated** in the tower: ${text}`)
    }

    // *================= JOINER =================* \\

    // Called from the unique tower joiner room class when a user joins it
    generateLevel() {
        //this.startGame()
        this.user.send('tower_start_game')

        if(this.spirit <= 0) {
            this.endGame()
            this.user.send('tower_end_game')
            this.user.handler.plugins.plugins.join.joinRoom({room: 801, x: 360, y: 520}, this.user)
            return
        }

        this.user.handler.plugins.plugins.join.joinRoom({room: this.nextRoomID, x: this.stairX, y: 799}, this.user)
    }

    get stairX() {
        return this._floorSide === 0 ? 493 : 1520-493
    }
}