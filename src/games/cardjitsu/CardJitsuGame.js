import CardJitsuPlayer from './CardJitsuPlayer'
import SenseiPlayer from './SenseiPlayer'

export default class CardJitsuGame {
    constructor(handler, players) {
        this.handler = handler

        this.fightingSensei = players.length > 1 ? false : true

        this.players = {} // seat: cjplayer
        this.playersById = {} // playerid : cjplayer

        this.loadedInPlayers = []

        this.timeouts = []

        this.started = false
        this.ended = false

        this.hasAwardedXp = false

        this.round = 1
        this.completedRounds = []

        this.roundTimeout = undefined

        //this fixes the CJ crash when both players at a mat exit the game at the same time
        if(players.length < 1) {
            this.forceEndGame()
            return
        }

        for(let player of players) {
            let seat = Object.values(this.players).length

            this.players[seat] = new CardJitsuPlayer(player, seat, this)
            this.playersById[player.id] = this.players[seat]
        }

        // power cards
        this.lowerValuesWinTies = false
        this.addValues = { seat: 0, value: 0, playThisRound: false }

        this.discardElements = { '4': 's', '5': 'w', '6': 'f' }
        this.discardColour = { '7': 'r', '8': 'b', '9': 'g', '10': 'y', '11': 'o', '12': 'p' }

        this.blockedCardSeat
        this.blockedCardType

        this.roundCardEffects = []

        this.xpMultiplier = false
        this.xpValues = { true: { "win": 25, "loss": 10 }, false: { "win": 30, "loss": 15 } }

        if (this.fightingSensei) {
            this.players[1] = this.players[0]
            this.players[1].seat = 1

            this.players[0] = new SenseiPlayer({}, 0, this)
        }

        this._setTimeout(this.havePlayersLoadedIn.bind(this), 45000)

        this.queuedAnimation = null

        this.animating = false

        this.winner = false
    }

    // A set timeout ot be used for all CJ related events, so that they can later be cleaned up
    _setTimeout(func, delay) {
        let timeout = setTimeout(func, delay)
        this.timeouts.push(timeout)

        return timeout
    }

    // Cleanup for when the game has ended
    cleanup() {
        this.ended = true

        for (let user of Object.values(this.players)) {
            delete user.user.user.CJGame
        }

        this.timeouts.forEach((timeout) => {
            clearTimeout(timeout)
        })
    }

    // Send a message to all players within the game
    // Filter includes user IDs to not send the message to
    send(action, args = {}, filter = []) {
        for (let user of Object.values(this.players)) {
            if (user.left) continue
            if (filter.includes(user.user.id)) continue

            user.user.user.send(action, args)
        }
    }

    // End the game if needed, safe to be called from outside the game too
    // Called from this file, as well as GameHandler.js when a player leaves
    forceEndGame(reason = '', filter = []) {
        this.checkWinner()
        this.giveXpToWinner()

        if (this.ended) return

        this.cleanup()
        this.send("cj_endgame_force", { reason: reason }, filter)
    }

    // Called within the constructor, used for checking if both players are loaded in
    // Called 45secs after the game has been initialised
    havePlayersLoadedIn() {
        for (let player of Object.values(this.players)) {
            if (!player.loaded) return this.forceEndGame(`${player.user.user.displayName} failed to join the game`)
            if (player.left) return this.forceEndGame(`${player.user.user.displayName} has left the game`)
        }
    }

    getFrames(anim) {
        let BASIC_ANIM = { ambient: { dual: false, frames: undefined, attack_top: true }, walk: { dual: false, frames: 106, attack_top: true }, tie: { dual: false, frames: 45, attack_top: true }, f: { dual: true, frames: 118, attack_top: true }, s: { dual: true, frames: 100, attack_top: true }, w: { dual: true, frames: 91, attack_top: true } }
        let POWER_ANIM = { pow_71: { dual: true, frames: 105, attack_top: true }, pow_72: { dual: true, frames: 204, attack_top: false }, pow_73: { dual: true, frames: 190, attack_top: true }, pow_74: { dual: true, frames: 194, attack_top: true }, pow_75: { dual: true, frames: 256, attack_top: true }, pow_76: { dual: true, frames: 186, attack_top: false }, pow_77: { dual: true, frames: 166, attack_top: true }, pow_78: { dual: true, frames: 142, attack_top: true }, pow_79: { dual: true, frames: 264, attack_top: true }, pow_80: { dual: true, frames: 175, attack_top: true }, pow_81: { dual: true, frames: 165, attack_top: true }, pow_82: { dual: true, frames: 240, attack_top: false }, pow_83: { dual: true, frames: 148, attack_top: false }, pow_84: { dual: true, frames: 175, attack_top: true }, pow_85: { dual: true, frames: 250, attack_top: true }, pow_86: { dual: true, frames: 178, attack_top: true }, pow_87: { dual: true, frames: 231, attack_top: false }, pow_88: { dual: true, frames: 222, attack_top: false }, pow_89: { dual: true, frames: 139, attack_top: true }, pow_90: { dual: true, frames: 176, attack_top: true }, pow_91: { dual: true, frames: 295, attack_top: false }, pow_92: { dual: true, frames: 183, attack_top: true }, pow_93: { dual: true, frames: 225, attack_top: false }, pow_94: { dual: true, frames: 292, attack_top: true }, pow_95: { dual: true, frames: 355, attack_top: false }, pow_96: { dual: true, frames: 166, attack_top: false }, pow_97: { dual: true, frames: 223, attack_top: true }, pow_249: { dual: true, frames: 200, attack_top: true }, pow_250: { dual: true, frames: 295, attack_top: true }, pow_251: { dual: true, frames: 205, attack_top: false }, pow_252: { dual: true, frames: 172, attack_top: true }, pow_253: { dual: true, frames: 261, attack_top: false }, pow_254: { dual: true, frames: 173, attack_top: true }, pow_255: { dual: true, frames: 296, attack_top: true }, pow_256: { dual: true, frames: 189, attack_top: true }, pow_257: { dual: true, frames: 233, attack_top: true }, pow_258: { dual: true, frames: 215, attack_top: false }, pow_259: { dual: true, frames: 125, attack_top: true }, pow_260: { dual: true, frames: 225, attack_top: true }, pow_349: { dual: true, frames: 145, attack_top: false }, pow_350: { dual: true, frames: 225, attack_top: true }, pow_351: { dual: true, frames: 294, attack_top: false }, pow_352: { dual: true, frames: 196, attack_top: false }, pow_353: { dual: true, frames: 139, attack_top: true }, pow_354: { dual: true, frames: 222, attack_top: false }, pow_355: { dual: true, frames: 183, attack_top: true }, pow_356: { dual: true, frames: 245, attack_top: false }, pow_357: { dual: true, frames: 190, attack_top: true }, pow_358: { dual: true, frames: 135, attack_top: false }, pow_359: { dual: true, frames: 413, attack_top: true }, pow_360: { dual: true, frames: 230, attack_top: true }, pow_427: { dual: true, frames: 306, attack_top: false }, pow_572: { dual: true, frames: 169, attack_top: true }, pow_573: { dual: true, frames: 280, attack_top: false }, pow_574: { dual: true, frames: 179, attack_top: false }, pow_575: { dual: true, frames: 268, attack_top: true }, pow_576: { dual: true, frames: 171, attack_top: true }, pow_577: { dual: true, frames: 218, attack_top: true }, pow_578: { dual: true, frames: 221, attack_top: true }, pow_579: { dual: true, frames: 198, attack_top: true }, pow_580: { dual: true, frames: 195, attack_top: true }, pow_581: { dual: true, frames: 218, attack_top: true }, pow_582: { dual: true, frames: 275, attack_top: false }, pow_583: { dual: true, frames: 181, attack_top: true }, pow_584: { dual: true, frames: 248, attack_top: false }, pow_585: { dual: true, frames: 235, attack_top: false }, pow_586: { dual: true, frames: 208, attack_top: true }, pow_587: { dual: true, frames: 230, attack_top: true }, pow_588: { dual: true, frames: 249, attack_top: true }, pow_589: { dual: true, frames: 205, attack_top: true }, pow_590: { dual: true, frames: 276, attack_top: true }, pow_591: { dual: true, frames: 180, attack_top: false }, pow_592: { dual: true, frames: 315, attack_top: true }, pow_593: { dual: true, frames: 170, attack_top: true }, pow_594: { dual: true, frames: 256, attack_top: true }, pow_595: { dual: true, frames: 260, attack_top: true }, pow_724: { dual: true, frames: 240, attack_top: false }, pow_725: { dual: true, frames: 306, attack_top: false }, pow_726: { dual: true, frames: 274, attack_top: false }, pow_727: { dual: true, frames: 240, attack_top: false }, pow_728: { dual: true, frames: 225, attack_top: true }, pow_729: { dual: true, frames: 235, attack_top: false }, pow_730: { dual: true, frames: 176, attack_top: true }, pow_731: { dual: true, frames: 283, attack_top: true }, pow_732: { dual: true, frames: 205, attack_top: true }, pow_733: { dual: true, frames: 218, attack_top: true }, pow_734: { dual: true, frames: 306, attack_top: false }, pow_735: { dual: true, frames: 380, attack_top: false }, pow_736: { dual: true, frames: 166, attack_top: false }, pow_737: { dual: true, frames: 290, attack_top: true }, pow_738: { dual: true, frames: 380, attack_top: false }, pow_739: { dual: true, frames: 204, attack_top: true }, pow_740: { dual: true, frames: 225, attack_top: false }, pow_741: { dual: true, frames: 296, attack_top: true }, pow_742: { dual: true, frames: 296, attack_top: true }, pow_743: { dual: true, frames: 258, attack_top: false }, pow_744: { dual: true, frames: 258, attack_top: true }, pow_745: { dual: true, frames: 283, attack_top: true }, pow_746: { dual: true, frames: 320, attack_top: true }, pow_747: { dual: true, frames: 294, attack_top: true }, pow_748: { dual: true, frames: 355, attack_top: false }, pow_749: { dual: true, frames: 166, attack_top: false }, pow_750: { dual: true, frames: 223, attack_top: true }, pow_804: { dual: true, frames: 339, attack_top: false } }

        let combined = { ...BASIC_ANIM, ...POWER_ANIM }

        return combined[anim].frames
    }

    getFrameTime(anim) {
        let frameCount = this.getFrames(anim)

        return ((frameCount / 24) * 1000) + 24
    }

    // For when the game is initially started
    sendGameInfoToClient() {
        let dataBuilder = []

        for (let player of Object.values(this.players)) {
            dataBuilder.push({ id: player.user.user.id, seat: player.seat, colour: player.user.user.color, name: player.user.user.displayName, belt: player.user.user.cj_belt, sensei: player.user.user?.isSensei })
        }

        this.send("start_cj_game", { users: dataBuilder })
    }

    // Called from CardJitsu.js when a player sends load
    loadInPlayer(user) {
        let CJPlayer = this.playersById[user.id]

        if (CJPlayer == null) return

        CJPlayer.loaded = true
        this.loadedInPlayers.push(user)

        if (this.fightingSensei) {
            this.players[0].loaded = true
            this.loadedInPlayers.push("1")
        }

        if (this.loadedInPlayers.length == 2) {
            this.sendGameInfoToClient()

            this._setTimeout(() => {
                this.initNewRound()
            }, this.getFrameTime("walk"))
        }
    }

    // Called from CardJitsu.js when a player leaves by clicking X in game
    handlePlayerLeave(user) {
        this.forceEndGame(`${user.displayName} has left the game`, [user.id])

        let CJPlayer = this.playersById[user.id]
        if (CJPlayer == null) return

        CJPlayer.left = true
    }

    // Setup rounds, give players cards
    initNewRound() {
        for (let player of Object.values(this.players)) {
            player.hasSelectedSlot = false
            player.selectedCard = undefined

            if (!this.started) {
                for (let i = 0; i < 5; i++) {
                    player.awardNewCard(i)
                }

                continue
            }

            player.awardNewCard(player.missingSlot)
        }

        if (this.blockedCardType != null) {
            this.players[this.blockedCardSeat].user.user.send("disable_cards", { element: this.blockedCardType })

            let otherSeat = this.blockedCardSeat == 0 ? 1 : 0
            this.players[otherSeat].user.user.send("enable_cards")

            let hasPlayableCards = false

            // check if player has any playable cards
            for (let card of this.players[this.blockedCardSeat].deck) {
                if (card.element != this.blockedCardType) hasPlayableCards = true
            }

            if (!hasPlayableCards) {
                // TODO: make this award a win 
                this.forceEndGame(`${this.players[this.blockedCardSeat].user.user.displayName} has no cards to play.`)
                return
            }
        } else {
            this.send("enable_cards")
        }

        this.started = true

        this.timeStarted = Date.now()

        this.startRound()
    }

    roundTimer(round) {
        if (this.completedRounds.includes(round)) return

        for (let player of Object.values(this.players)) {
            if (player.hasSelectedSlot == true) continue
            if (player.user.user?.isSensei) continue

            let slot = Math.floor(Math.random() * 5)

            if (this.blockedCardSeat != null && this.blockedCardSeat == player.seat) {
                // we know that the player has playable cards
                for (let ix in player.deck) {
                    let card = player.deck[ix]
                    if (card.element != this.blockedCardType) {
                        slot = ix
                        break
                    }
                }
            }

            this.playSlot(player, slot)
        }
    }

    startRound() {
        let round = this.round

        this.roundTimeout = this._setTimeout(this.roundTimer.bind(this, round), 20000)

        this.send("cj_unlock") // lock cards on client so they cant be played
        this.send("start_round")
    }

    playSlot(player, slot, playerIsCJPlayer = true) {
        if (!playerIsCJPlayer) {
            let CJPlayer = this.playersById[player.id]

            player = CJPlayer
        }

        if (!player) return

        if (player.hasSelectedSlot) return

        if (player.deck[slot] === undefined) return

        if (player.deck[slot].element == this.blockedCardType && player.seat == this.blockedCardSeat) {
            return
        }

        player.selectedCard = player.deck[slot]

        player.hasSelectedSlot = true
        player.missingSlot = slot

        this.send("remove_card", { slot: slot }, [player.user.user.id])
        player.user.user.send("move_my_card", { slot: slot })

        if (this.fightingSensei) {
            this.players[0].playCard()
        }

        // check if we should start determining round winner
        let shouldStart = true

        for (let player of Object.values(this.players)) {
            if (!player.hasSelectedSlot) shouldStart = false
        }

        if (!shouldStart) return

        this._setTimeout(() => {
            this.handleDeal()
        }, 300)

        clearTimeout(this.roundTimeout)
    }

    // returns winning seat
    typeCheck(card1, card2) {
        if (card1.element == card2.element) {
            if (card1.value == card2.value) return "tie"

            let winner = Math.max(card1.value, card2.value)

            if (card1.value == winner) {
                return 0
            }

            return 1
        }

        let beats = { 'f': 's', 'w': 'f', 's': 'w' }

        if (card2.element == beats[card1.element]) {
            return 0
        }

        if (card1.element == beats[card2.element]) {
            return 1
        }
    }

    sendCardEffect(effect, winner) {
        this.roundCardEffects.push({ effect: effect, winner: winner })
        // this.send("card_effect", {effect: effect, winner: winner})
    }

    sendEffectToClients() {
        for (let effect of this.roundCardEffects) {
            this.send("card_effect", effect)
        }

        this.roundCardEffects = []
    }

    changeCardElement(card, othercard, seat) {
        let switchElements = { "16": { "w": "f" }, "17": { "s": "w" }, "18": { "f": "s" } }

        if (["16", "17", "18"].includes(card.power_id)) {
            this.sendCardEffect(card.power_id, seat)

            let elem = switchElements[card.power_id][othercard.element]
            if (elem == null) return card

            othercard.element = elem
            othercard.modifiedElement = true
        }

        return card
    }

    determineWinner(card1, card2) {
        card1 = this.changeCardElement(card1, card2, 0)
        card2 = this.changeCardElement(card2, card1, 1)

        if (card1.power_id == "1" || card2.power_id == "1") {
            let winningSeat = card1.power_id == "1" ? 0 : 1
            this.sendCardEffect("1", winningSeat)
        }

        if (this.lowerValuesWinTies == true) {
            this.lowerValuesWinTies = false

            if (card1.element == card2.element) {
                if (card1.value == card2.value) {
                    return "tie"
                }

                if (card1.value < card2.value) {
                    // card1 = 0, card2 = 1 restart
                    return 0
                }

                return 1
            }
        }

        if (this.addValues.playThisRound == true) {
            let card = this.addValues.seat == 0 ? card1 : card2

            card.value = parseInt(card.value)
            card.value += this.addValues.value

            this.addValues.playThisRound = false
        }

        this.blockedCardSeat = null
        this.blockedCardType = null

        return this.typeCheck(card1, card2)
    }

    handleDeal() {
        let card1 = this.players[0].selectedCard
        let card2 = this.players[1].selectedCard

        let winner = this.determineWinner(card1, card2)
        let winnerSeat = winner

        if (winner != "tie") {
            this.players[winner].hasScored = true
        }

        let loser = winner == 0 ? 1 : 0 // only used if it isnt a tie

        let winnerCard = winner == 0 ? card1 : card2
        let cardAnimName = winnerCard.power_id == 0 ? winnerCard.element : `pow_${winnerCard.cardID}`

        // power card stuff (current round)

        if (["4", "5", "6"].includes(winnerCard?.power_id) && winner != "tie") {
            this.sendCardEffect(winnerCard.power_id, winner)

            this.players[loser].discardElement(this.discardElements[winnerCard.power_id])
        }

        if (["7", "8", "9", "10", "11", "12"].includes(winnerCard?.power_id) && winner != "tie") {
            this.sendCardEffect(winnerCard.power_id, winner)

            this.players[loser].discardColour(this.discardColour[winnerCard.power_id])
        }

        // end of power card stuff

        // power card stuff (next round)

        // should tie
        if (card1.power_id == "1" || card2.power_id == "1") {
            this.lowerValuesWinTies = true
        }

        // + or - depending on power card
        if (["2", "3"].includes(winnerCard?.power_id) && winner != "tie") {
            // winner for sendCardEffect is different here, it sends who the card should affect
            this.sendCardEffect(winnerCard.power_id, winner)

            this.addValues.playThisRound = true
            this.addValues.seat = winnerCard.power_id == "2" ? winner : loser
            // if power_id is 2 then affect winner otherwise affect loser

            this.addValues.value = winnerCard.power_id == "2" ? 2 : -2
        }

        // disallow certain cards from being played in the future
        if (["13", "14", "15"].includes(winnerCard?.power_id) && winner != "tie") {
            let allowed = { "13": "s", "14": "f", "15": "w" }

            this.sendCardEffect(winnerCard.power_id, winner)

            this.blockedCardType = allowed[winnerCard.power_id]
            this.blockedCardSeat = loser
        }

        // end of power card stuff

        this._setTimeout(() => {
            setTimeout(() => {
                this.sendEffectToClients()

                this.send("round_over", {
                    seat0: card1.cardID,
                    seat0card: card1,
                    seat1: card2.cardID,
                    seat1card: card2,
                    winner: winnerSeat
                })

            }, 150)

            let time = this.getFrameTime(cardAnimName)

            if (winner == "tie") {
                time = ((50 / 24) * 1000) + 24
            } else {
                let winnerPlayer = winner == 0 ? this.players[0] : this.players[1]
                winnerPlayer.addCardToBank(winnerCard)
            }

            if (winnerCard?.power_id > 1 && winner != "tie") {
                time += 350
            }

            if (winnerCard?.cardID == "256" && winner != "tie") {
                this.players[0].user.user.addStamp(246)
                this.players[1].user.user.addStamp(246)
            }

            if (winner == "tie") cardAnimName = "tie"

            this.playRoundAnimation(cardAnimName, time, winnerSeat, this.round)
        }, 500)
    }

    loadAnimation(user, animation) {
        if (!animation || animation == "") return

        let CJUser = this.playersById[user.id]

        if (CJUser.downloadedAnimations.includes(animation)) return

        CJUser.downloadedAnimations.push(animation)

        if (this.queuedAnimation == null) return
    }

    playRoundAnimation(cardAnimName, cardAnimTime, winnerSeat, round, force = false) {
        // TODO: make this actually work for loaded players cards

        let startDelay = 550

        for (let player of Object.values(this.players)) {
            if (this.fightingSensei && player.seat == 0) continue

            if (!player.downloadedAnimations.includes(cardAnimName)) {
                startDelay = 1700
            }
        }

        setTimeout(() => {
            this.send("play_animation", { animation: cardAnimName, winner: winnerSeat })

            this.queuedAnimation = null

            for (let player of Object.values(this.players)) {
                if (this.fightingSensei && player.seat == 0) continue
    
                player.downloadedAnimations.push(cardAnimName)
            }

            this._setTimeout(() => {
                this.onRoundComplete()
            }, cardAnimTime)
        }, startDelay)
        // sleep for the duration of anim, then complete the round
    }

    _checkWin(player) {
        let hasWon = false

        // single element win
        for (let element of Object.values(player.bank)) {
            let colours = []
            let cardUUID = []

            for (let i = 0; i < element.length; i++) {
                let card = element[i]

                if (colours.includes(card.color)) {
                    continue
                }

                colours.push(card.color)
                cardUUID.push(card.uuid)

                if (colours.length == 3) {
                    player.user.user.addStamp(244)

                    hasWon = true
                    return [hasWon, cardUUID]
                }
            }
        }

        // if player possily cant win with multi element win, dont bother with the check

        // multi element win (thanks chatgpt)
        const cartesian = (...a) => a.reduce((a, b) => a.flatMap(d => b.map(e => [].concat(d, e))), [[]]);
        let uuidArray = [];

        let elements = Object.values(player.bank);
        for (let combo of cartesian(...elements)) {
            let colors = new Set(combo.map(card => card.color));

            if (colors.size === 3) {
                let uuids = combo.map(card => card.uuid);
                uuidArray.push(...uuids);

                player.user.user.addStamp(242)
                // player has won TODO show the card uuids
                return [true, uuidArray]
            }
        }

        return [hasWon, []]
    }

    checkWinner() {
        let hasWon = false
        let p
        let uuids = []

        for (let player of Object.values(this.players)) {
            p = player
            let win = this._checkWin(player)
            let w = win[0]
            uuids = win[1]

            if (w === true) {
                hasWon = true

                if (p.bank['f'].length + p.bank['w'].length + p.bank['s'].length >= 9) {
                    p.user.user.addStamp(248)
                }

                break
            }
        }

        if (hasWon == true && p != null) {
            this.winner = p
        }

        return [hasWon, p, uuids]
    }

    onRoundComplete() {
        this.completedRounds.push(this.round)
        this.send("cj_lock")

        this.animating = false

        this.round += 1

        if (this.round > 3) {
            let winnerArr = this.checkWinner()

            let winner = winnerArr[0]
            let player = winnerArr[1]
            let uuids = winnerArr[2]

            if (winner === true) {
                //send end game
                this.onGameOver(player, uuids)
                return
            }
        }

        // check winner, if no winner, init new round
        this.initNewRound()
    }

    giveXpToWinner() {
        if (this.hasAwardedXp == true) return

        let winner = this.winner

        if (!winner) return

        this.hasAwardedXp = true
        winner.updateXP(this.xpValues[this.xpMultiplier]["win"])
        winner.addWin()

        if (this.fightingSensei && winner.seat == 1) {
            // player won against sensei
            if (winner.user.user.cj_belt == "black") {
                winner.user.user.update({ cj_belt: "ninja" })
                winner.user.user.inventory.add(104)
                winner.user.user.save()
                winner.user.user.addStamp(236)

                winner.user.user.awardBelt = true
                winner.user.user.send('add_item', { item: 104, name: "", slot: "face", coins: winner.user.user.coins, hide: true })
            }
        }
    }

    onGameOver(winner, winnerCardUUIDs, customMessage) {
        this.send("game_won", { winner: winner.seat, uuid: winnerCardUUIDs })
        this.winner = winner

        
        this.ended = true


        let loser = winner.seat == 0 ? 1 : 0
        loser = this.players[loser]


        this.giveXpToWinner()

        if (!loser.hasScored) winner.user.user.addStamp(238)

        if (!this.fightingSensei) loser.updateXP(this.xpValues[this.xpMultiplier]["loss"])

        // award points

        this._setTimeout(() => {
            this.send("winmsg", { message: winner.user.user.displayName + " Wins" })
            winner.user.user.finishedGGGame = true;
            loser.user.user.finishedGGGame = true;
            if (this?.handler?.elasticsearch) {
                let timeInGame = (Date.now() - this.timeStarted) / 1000;
                this.handler.elasticsearch.logJitsu(winner.user.user, loser.user.user, timeInGame)
            }
            this.cleanup()
            // force end game with user win message
        }, 1200)
    }

}
