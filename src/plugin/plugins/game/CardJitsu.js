import GamePlugin from '@plugin/GamePlugin'
import CardJitsuGame from '../../../games/cardjitsu/CardJitsuGame'
import { hasProps, isNumber, isString, isLength, isInRange } from '@utils/validation'


export default class CardJitsu extends GamePlugin {

    constructor(handler) {
        super(handler)

        this.events = {
            'cj_load': this.CJLoad,
            'cj_leave': this.CJLeave,
            'select_card': this.selectCard,
            'get_my_level': this.getMyLevel,
            'load_animation': this.loadAnimation,
            'get_my_cards': this.getMyCards,
            'cj_card_buy': this.cjBuy
        }

        this.privateEvents = {
            'setup': this.setupCJGame
        }

        this.cardscrumbs = {...this.handler.crumbs.cards}

        this.normalCards = []
        this.powerCards = []

        for (let cardID of Object.keys(this.cardscrumbs)) {
            let card = this.cardscrumbs[cardID]
            card.cardID = cardID

            if (card.power_id > 0) {
                this.powerCards.push({...card})
                continue
            }

            this.normalCards.push(card)
        }
    }

    newCjCard(powercard=false) {
        let cards = this.normalCards

        if (powercard == true) {
            cards = this.powerCards
        }

        let card = cards[Math.floor(Math.random() * cards.length)]

        return card
    }

    awardCard() {
        let chance = Math.ceil(Math.random() * 100)

        let powerCard = false

        if (chance <= 20) {
            powerCard = true
        }

        let card = this.newCjCard(powerCard)

        return card.cardID
    }

    async cjBuy(args, user) {
        // TODO: dont allow 2 buy cards if they dont have starte r  Dekc

        let item = args.item

        if (!item) {
            return
        }

        if (isNaN(item)) {
            return
        }

        if (!isInRange(item, 1, 3)) {
            return            
        }
        
        let cards = await this.handler.db['cards'].findAll({where: {userId: user.id}})

        let prices = {
            1: 3000,
            2: 5000,
            3: 10000
        }

        let cardAmounts = {
            1: 1, 
            2: 3,
            3: 5
        }

        if (cards.length == 0) {
            user.send("error", {error: "You need to play a game of Card-Jitsu before buying a pack"})
            user.send('cj_card_buy' + item.toString(), { error: true })            
            return
        }

        if (user.coins < prices[item]) {
            user.send("error", {error: "You do not have enough coins"})
            user.send('cj_card_buy' + item.toString(), { error: true })            
            return
        }

        user.updateCoins(-prices[item])

        let tempCard = []

        let i = 0
        while (i < cardAmounts[args.item]) {
            i += 1

            let c = this.awardCard()
            await this.handler.db['cards'].create({userId: user.id, cardId: c})
            tempCard.push(c)
        }

        user.send('cj_card_buy' + item.toString(), { card: tempCard, coins: user.coins })
    }

    async getMyCards(args, user) {
        let cards = await this.db['cards'].findAll({where: {userId: user.id}})
        
        let temp = []

        for (let card of cards) {
            temp.push(card.dataValues.cardId)
        }

        user.send("get_my_cards", {cards: temp})
    }

    loadAnimation(args, user) {
        if (!user?.CJGame?.ended == false) return
        if (!user.CJGame) return

        user.CJGame.loadAnimation(user, args?.animation)
    }

    setupCJGame(users) {
        let CJGame = new CardJitsuGame(this.handler, users)

        CJGame.xpMultiplier = true 
 
        users.forEach(function(user, _) {
            user.user.CJGame = CJGame
        })
    }

    CJLoad(_, user) {
        if (!user?.CJGame?.ended == false) return

        if (!user?.CJGame) {
            // vsing sensei
            let CJGame = new CardJitsuGame(this.handler, [{id: user.id, seat: 1, user: user}])
            user.CJGame = CJGame
        }
        
        user.CJGame.loadInPlayer(user)
    }

    CJLeave(_, user) {
        if (!user?.CJGame?.ended == false) return
        if (!user?.CJGame) return

        user.CJGame.handlePlayerLeave(user)
    }

    selectCard(args, user) {
        if (!user) return;
        if (!user.CJGame) return;
        if (!user?.CJGame?.ended == false) return
        if (args.slot == null) return

        if (isNaN(args.slot)) return
        if (!isInRange(args.slot, 0, 4)) return

        user.CJGame.playSlot(user, args.slot, false)
    }

    getMyLevel(_, user) {
        user.send("get_my_level", {belt: user.dataValues.cj_belt, xp: user.dataValues.cj_xp})
    }

}
