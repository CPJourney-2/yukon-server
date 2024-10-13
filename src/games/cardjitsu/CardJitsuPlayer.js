const crypto = require('crypto');


export default class CardJitsuPlayer {
    constructor(player, seat, game) {
        this.user = player//
        this.seat = seat
        this.game = game

        this.loaded = false // has the player loaded in to the game
        this.left = false // has the player left the game

        this.deck = [undefined, undefined, undefined, undefined, undefined]

        this.hasSelectedSlot = false
        this.selectedCard = undefined //

        this.hasScored = false

        this.missingSlot = undefined

        this.downloadedAnimations = ["ambient", "tie", "walk", "f_attack", "f_react", "s_react", "s_attack", "w_react", "w_attack", "w", "f", "s"]

        this.bank = { 'f': [], 'w': [], 's': [] }

        this.forcedDeck = [80, 21, 38, 38, 51]

        this.cards = JSON.parse(JSON.stringify(this.game.handler.crumbs.cards))

        this.ownedCards = []
        this.setupCards()
    }

    async giveStarterDeck() {
        let cards = [1,6,9,14,17,20,22,23,26]
        let power = [73,89,81]
        
        cards.push(power[Math.floor(Math.random() * 3) ])
        
        for (let card of cards) {
            await this.game.handler.db['cards'].create({userId: this.user.id, cardId: card})
        }
    }

    async setupCards() {
        if (!this.user.id) return // sensei
        let cards = await this.game.handler.db['cards'].findAll({where: {userId: this.user.id}})

        if (cards.length == 0) {
            await this.giveStarterDeck()
            cards = await this.game.handler.db['cards'].findAll({where: {userId: this.user.id}})
        }

        for (let card of cards) {
            let c = this.cards[card.dataValues.cardId.toString()]
            c.cardID = card.dataValues.cardId

            this.ownedCards.push(c)
        }

    }

    addItem(item, user) {
        let slot = "body"
        user.inventory.add(item)

        user.send('add_item', { item: item, name: "", slot: slot, coins: user.coins, hide: true })
    }

    addWin() {
        let wins = this.user.user.dataValues.cj_wins
        this.user.user.update({ cj_wins: wins += 1 })
        this.user.user.save()

        if (wins == 25) {
            this.user.user.addStamp(240)
        }

    }

    updateXP(amount) {
        let belts = {
            "white": 125,
            "yellow": 325,
            "orange": 525,
            "green": 750,
            "blue": 1000,
            "red": 1300,
            "purple": 1600,
            "brown": 1900,
            "black": 2200
        }

        let xp = this.user.user.dataValues.cj_xp
        this.user.user.update({ cj_xp: xp += amount })
        this.user.user.save()

        let currentBelt = this.user.user.dataValues.cj_belt

        if (currentBelt == "ninja") return

        let beltToAward = ""

        for (let beltColour in belts) {
            let beltMinXP = belts[beltColour]

            if (beltMinXP <= xp) {
                beltToAward = beltColour
                continue
            }

            break
        }

        if (beltToAward == currentBelt || beltToAward == "") return

        // award belt
        this.user.user.update({ cj_belt: beltToAward })
        this.user.user.save()

        // send user a message to open belt ui #
        this.user.user.awardBelt = true

        let beltIDs = {
            "white": 4025,
            "yellow": 4026,
            "orange": 4027,
            "green": 4028,
            "blue": 4029,
            "red": 4030,
            "purple": 4031,
            "brown": 4032,
            "black": 4033
        }

        if (beltToAward == "white") {
            this.user.user.addStamp(230)
            this.user.user.addSystemPostcard(177)
        }

        if (beltToAward == "blue") {
            this.user.user.addStamp(232)
            this.user.user.addSystemPostcard(178)
        }

        if (beltToAward == "black") {
            this.user.user.addStamp(234)
            this.user.user.addSystemPostcard(179)
        }
 
        this.addItem(beltIDs[beltToAward], this.user.user)
    }

    getCard() {
        let newArr = []

        let idArr = this.deck.map(e => {
            if (e == null) return null

            return e?.cardID   
        })

        for (let c of this.ownedCards) {
            if (c == null) continue

            if (idArr.includes(c?.cardID)) continue

            newArr.push(c)
        }

        return newArr[Math.floor(Math.random() * newArr.length)]
    }

    async awardNewCard(slot) {
        let starterDeck = [1,6,9,14,17,20,22,23,26]

        let card = this.getCard()

        if (card == null) {
            let cards = this.cards

            card = cards[Math.floor(Math.random() * starterDeck.length)]
            let cardID = Object.keys(cards).find(key => cards[key] === card)
            card.cardID = cardID
        }

        // make the card unique
        card = JSON.parse(JSON.stringify(card))

        card.uuid = crypto.randomUUID()

        this.deck[slot] = card

        this.user.user.send("set_card", { slot: slot, card: card.cardID, uuid: card.uuid })

        this.game.send("add_enemy_card", { slot: slot, uuid: card.uuid }, [this.user.id])
    }

    addCardToBank(card) {
        if (card?.modifiedElement == true) {
            card.element = this.game.handler.crumbs.cards[card.cardID].element
        }

        this.bank[card.element].push(card)
    }

    discardElement(element) {
        let elementArr = this.bank[element]
        if (elementArr.length == 0) return

        let card = this.bank[element].pop()

        setTimeout(() => {
            this.game.send("destroy_element", { uuid: card.uuid, seat: this.seat })
        }, 1000)
    }

    discardColour(colour) {
        for (let element in this.bank) {
            let elementArr = this.bank[element]

            for (let i = elementArr.length - 1; i >= 0; i--) {
                let card = elementArr[i]

                if (card.color == colour) {
                    elementArr.splice(i, 1);
                    this.bank[element] = elementArr

                    setTimeout(() => {
                        this.game.send("destroy_element", { uuid: card.uuid, seat: this.seat })
                    }, 1000)

                    return
                }
            }
        }
    }

}
