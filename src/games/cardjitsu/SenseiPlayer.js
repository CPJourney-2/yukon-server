import CardJitsuPlayer from './CardJitsuPlayer';

const crypto = require('crypto');


export default class SenseiPlayer extends CardJitsuPlayer {
    constructor(player, seat, game) {
        super(player, seat, game)

        this.user = {}
        this.user.user = {} // this is so stupid why did i make it like this

        this.user.user.send = (args = '', action = {}, filter = []) => {} // to prevent errors
        this.user.user.id = 9999999999999999
        this.user.user.color = 14
        this.user.user.displayName = "Sensei"
        this.user.user.cj_belt = null
        this.user.user.isSensei = true
        this.user.user.addStamp = (stamp=1) => {}

        this.user.id = 9999999999999999 // not sure why i have it different lol

        this.senseiCards = {'f': [], 'w': [], 's': []}

        for (let card of Object.values(this.cards)) {
            this.senseiCards[card.element].push(card)
        }

        this.beats = { 's': 'f', 'f': 'w', 'w': 's' }

    }

    updateXP(amount) {
        // so we don't cause errors
    }

    addWin(idk=a) {
        // so we dont crash
    }

    getCard(element, minValue=false) {
        let possibleCards = this.senseiCards[element]

        let possibleCardValues = Object.values(possibleCards)
        let startingPoint = Math.floor(Math.random() * possibleCardValues.length)

        let c

        for (let i = startingPoint; i < possibleCardValues.length; i++) {
            let card = possibleCardValues[startingPoint]

            if (minValue != false && minValue < card.value) continue

            let rand = Math.ceil(Math.random() * 10)

            // 10% chance of picking current card
            if (rand > 9) {
                c = card
                break
            }
        }

        if (c == undefined) {
            // just incase in the rare chance it doesn't pick any card from the loop, due to bad rng
            c = this.senseiCards[element][startingPoint]
        }

        let cards = this.cards
        let cardID = Object.keys(cards).find(key => cards[key] === c);
        c.cardID = cardID

        return c
    }

    getWinningCard() {
        let enemyCard = {...this.game.players[1].selectedCard}
        
        let card = this.getCard(this.beats[enemyCard.element])
        let cardElement = card.element

        // + and - should never apply because you shouldnt be able to play blocked card and +/- in same round

        if (this.game.blockedCardSeat == 0) {
            // play same card but with higher value or tie

            let c = this.getCard(enemyCard.element, enemyCard.value)

            if (card.value < enemyCard.value) {
                card = enemyCard
            } else {
                card = c
            }
        }

        // element swaps

        this.game.changeCardElement(this.game.players[1].selectedCard, card, 0)

        if (card.element != cardElement) {
            // card has changed
            let c = this.getCard(enemyCard.element, enemyCard.value)

            if (card.value < enemyCard.value) {
                card = enemyCard
            } else {
                card = c
            }
        }
        
        return card
    }

    addWin(yep={}) {
        // so he dont crash the server stupid sensay....
    }

    _playCard() {
        let playerBelt = this.game.players[1].user.user.cj_belt
        
        if (playerBelt != "black" && playerBelt != "ninja") {
            return this.getWinningCard()
        }

        let rand = Math.random()

        if (rand >= 0.3) {
            // 70% chance to lose this round
            return this.getWinningCard()
        }

        let beats = { 'f': 's', 'w': 'f', 's': 'w' }
        return this.getCard(beats[this.game.players[1].selectedCard.element])
        // get the losing card
    }

    playCard() {
        let card = this._playCard()

        let slot = Math.floor(Math.random() * 5)
        let cardUUID = this.deck[slot].uuid

        card.uuid = cardUUID

        this.selectedCard = card
        this.missingSlot = slot
        this.hasSelectedSlot = true

        this.game.send("remove_card", {slot: slot})

        return card
    }

    awardNewCard(slot) {
        let cards = this.cards

        let card = cards[Math.floor(Math.random() * 100) + 1]
        let cardID = Object.keys(cards).find(key => cards[key] === card);

        card = JSON.parse(JSON.stringify(card))

        card.uuid = crypto.randomUUID()
        card.cardID = cardID
        this.deck[slot] = card

        this.game.send("add_enemy_card", { slot: slot, uuid: card.uuid })
    }

}
