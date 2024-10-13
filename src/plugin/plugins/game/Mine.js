import GamePlugin from '@plugin/GamePlugin'


export default class Mine extends GamePlugin {

    constructor(handler) {
        super(handler)
        this.events = {
            'mine': this.mine
        }
        this.mineRooms = [813, 805];

        this.miningBounds = {
            '813': {
                'topLeftX': 141,
                'topLeftY': 533,
                'bottomRightX': 1313,
                'bottomRightY': 963
            },
            '805': {
                'topLeftX': 236,
                'topLeftY': 183,
                'bottomRightX': 1274,
                'bottomRightY': 764
            }
        }

        this.miningSessions = {};
        this.playerPositionData = {};

        this.minTime = 10
        this.maxTime = 45

        // coins
        this.minCoinsMoving = 35
        this.maxCoinsMoving = 80

        this.AFKMinCoins = 1
        this.AFKMaxCoins = 5

        this.AFKStreakMinCoins = 1
        this.AFKStreakMaxCoins = 5

        this.timeout = () => {return this.minTime + Math.floor(Math.random() * (this.maxTime - this.minTime + 1))}
        this.coins = (delay) => {return Math.floor(Math.random() * (this.maxValue - this.minValue + 1) + this.minValue);}

        setInterval(async () => {
            await this.checkCurrentMiners()
        }, 1500)
    }

    getRandomNumber(x, y) {
        return Math.floor(Math.random() * (y - x) + x) + 1;
    }
    
    getCurrentTimestamp() {
        return Math.floor(Date.now() / 1000)
    }

    async checkCurrentMiners() {

        for (const userObject in this.miningSessions) {
            let obj = this.miningSessions[userObject]
            let user = obj.user            

            if (!this.isPlayerOnline(user) || !this.isPlayerMining(user)) {
                delete this.miningSessions[user.id]
                continue
            }

            if (user.x !== obj.mineStartX || user.y !== obj.mineStartY) {
                // player has moved
                continue
            }

            if (this.getCurrentTimestamp() < obj.miningStarted + obj.waitTime) {
                // enough time hasn't passed to give player reward
                continue
            } 


            if (obj.miningStreak <= 2) {
                // do nothing
            } else if (obj.miningStreak >= 3 && obj.miningStreak <= 8) {
                obj.coinAmountToAdd = this.getRandomNumber(this.AFKMinCoins, this.AFKMaxCoins)
            } else {
                obj.coinAmountToAdd = this.getRandomNumber(this.AFKStreakMinCoins, this.AFKStreakMaxCoins)
            }
            //todo afk kick

            let coins = this.miningSessions[userObject].coinAmountToAdd
            user.updateCoins(coins)
            user.send('mine_coins', {coins: coins})

            if (this?.handler?.elasticsearch) {
                await this.handler.elasticsearch.logCoins(user, "mining", coins, false)
            }

            // If at the berg, check for the penguins at work stamps
            if(user.room.id === 805) {
                user.workFulfillments.coinsEarned.berg += coins
                if(user.workFulfillments.coinsEarned.berg >= 500 && !user.stamps.includes(707)) {
                    user.addStamp(707)
                } else if(user.workFulfillments.coinsEarned.berg >= 1000 && !user.stamps.includes(708)) {
                    user.addStamp(708)
                } else if(user.workFulfillments.coinsEarned.berg >= 2000 && !user.stamps.includes(709)) {
                    user.addStamp(709)
                }
                if(Object.values(user.workFulfillments.coinsEarned).every(amount => amount >= 500) && !user.stamps.includes(712)) {
                    user.addStamp(712)
                }
            }

            this.setupMiningSession(user, obj.miningStreak + 1)
        }
    }

    isPlayerOnline(user) {
        return user.joinedServer
    }

    isPlayerInCavemine(user) {
        return this.mineRooms.includes(user.room.id);
    }

    isPlayerInMiningArea(user) {
        const topLeftX = this.miningBounds[user.room.id].topLeftX;
        const topLeftY = this.miningBounds[user.room.id].topLeftY;
        const bottomRightX = this.miningBounds[user.room.id].bottomRightX;
        const bottomRightY = this.miningBounds[user.room.id].bottomRightY;

        const playerX = user.x;
        const playerY = user.y;
        
        if (playerX >= topLeftX && playerX <= bottomRightX && playerY >= topLeftY && playerY <= bottomRightY) {
          return true
        }

        return false
    }

    playerOnlyHasHelmetEquipped(user) {
        let values = ['head', 'face', 'neck', 'body', 'hand', 'feet']
        let hardHatIds = [403, 429, 674, 1133, 1765, 5177, 10403, 10429, 11133, 35033, 342, 380121, 380159, 770, 380258, 380314, 380410];
        let isWearingAnotherItem = false
        let zeroCount = 0

        values.forEach((key, _) => {
            let value = user.dataValues[key]

            if (value !== 0) { // item is present in slot
                if (!hardHatIds.includes(value)) {
                    // item in slot is not a hardhat
                    isWearingAnotherItem = true
                    return
                }                
            }

            if (value == 0) {
                zeroCount++
            }
        })

        if (zeroCount === 6) { // player wearing nothing
            return false
        }

        return !isWearingAnotherItem
    }


    isPlayerMining(user) { // 
        if (!this.isPlayerInCavemine(user)) {
            return false
        }

        if (!this.isPlayerInMiningArea(user)) {
            return false
        }

        if (!this.playerOnlyHasHelmetEquipped(user)) {
            return false
        }

        if (user.frame !== 26) { // player not dancing
            return false
        }

        return true
    }


    async setupMiningSession(user, streak=0) {
        if (user.id in this.miningSessions) {
            // prevents players from having multiple open mining sessions
            delete this.miningSessions[user.id]
        }

        if (!this.isPlayerMining(user)) {
            return
        }

        this.miningSessions[user.id] = {
            coinAmountToAdd: this.getRandomNumber(this.minCoinsMoving, this.maxCoinsMoving), 
            waitTime: this.timeout(), 
            miningStarted: this.getCurrentTimestamp(),
            miningStreak: streak,
            mineStartX: user.x, // x & y = position when player started mining
            mineStartY: user.y,
            user: user
        }

    }

    async mine(_, user) {
        if (!this.isPlayerMining(user)) {
            return
        }

        await this.setupMiningSession(user)
    }

}
