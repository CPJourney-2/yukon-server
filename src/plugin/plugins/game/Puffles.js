import GamePlugin from "@plugin/GamePlugin"

import { isNumber } from "@utils/validation"

export default class Actions extends GamePlugin {
    constructor(handler) {
        super(handler)

        this.events = {
            get_puffles: this.getPuffles,
            adopt_puffle: this.adoptPuffle,
            walk_puffle: this.walkPuffle,
            stop_walking: this.stopWalking,
            get_puffle_type: this.getPuffleType,
            get_wellbeing: this.getWellbeing,
            puffle_buy_item: this.buyPuffleItem,
            discard_puffle: this.discardPuffle,
            update_puffle_energy: this.updatePuffleEnergy,
            update_puffle_rest: this.updatePuffleRest,
            check_puffle_health: this.checkPuffleHeatlh,
        }
    }

    async getPuffles(args, user) {
        if (!args.userId) {
            return
        }

        let userId = args.userId
        let puffles = await this.db.puffles.findAll({
            where: { userId: userId },
            attributes: ["id", "type", "name"],
        })
        if (puffles) {
            // if user is walking puffles
            let isWalking = await this.db.users.findOne({
                where: { id: userId },
                attributes: ["walking"],
            })

            isWalking = isWalking.dataValues.walking

            for (let i = 0; i < puffles.length; i++) {
                let puffle = puffles[i]
                if (isWalking != 0 && puffle.dataValues.id == isWalking) {
                    puffles.splice(i, 1)
                }
            }

            let pufflesForHealth = await this.db.puffles.findAll({
                where: { userId: userId },
            })
            let pufflesAfterCheck = await this.checkPufflesForHealth(
                pufflesForHealth,
                user
            )

            user.send("get_puffles", {
                userId: userId,
                puffles: pufflesAfterCheck,
            })
        }
    }

    async checkPufflesForHealth(puffles, user) {
        for (let i = 0; i < puffles.length; i++) {
            let puffle = puffles[i]

            const isInvulnerable =
                this.crumbs["puffles"][puffle.type].invulnerable

            if (isInvulnerable) {
                // Special Puffles
                continue
            }

            if (user.id !== puffle.userId) continue;

            // puffle health is == last feed time / 30 days
            let lastFeed = puffle.dataValues.last_feed
            let lastSlept = puffle.dataValues.last_slept

            let lastFeedDate = new Date(lastFeed)
            let lastSleptDate = new Date(lastSlept)
            let currentDate = new Date()
            let lastFeedTime = lastFeedDate.getTime()
            let lastSleptTime = lastSleptDate.getTime()
            let currentTime = currentDate.getTime()
            let timeSinceLastFeed = currentTime - lastFeedTime
            let daysSinceLastFeed = timeSinceLastFeed / (1000 * 3600 * 24)
            let timeSinceLastSlept = currentTime - lastSleptTime
            let daysSinceLastSlept = timeSinceLastSlept / (1000 * 3600 * 24)

            let health = 100 - daysSinceLastFeed * 3.33333333
            health = Math.round(health)

            puffle.update({ health: health })

            let sleep = 100 - daysSinceLastSlept * 3.33333333
            sleep = Math.round(sleep)

            puffle.update({ rest: sleep })

            if (health < 0 && puffle.id !== user.walking) {
                if (this?.handler?.elasticsearch) {
                    let puffleType = this.handler.crumbs.puffles[puffle.type].name
                    await this.handler.elasticsearch.logPuffles(user, puffle.id, puffleType, puffle.name, "death")
                }
                this.sendPufflePostCard(puffle, user)
                await this.db.puffles.destroy({
                    where: { id: puffle.dataValues.id },
                })

                puffles.splice(i, 1)
            } else if (health < 20 && health > 0 && !puffle.dataValues.postcard_hungry) {
                user.addSystemPostcard(110, puffle.dataValues.name)
                puffle.update({ postcard_hungry: 1 })
            }
        }

        return puffles
    }

    async sendPufflePostCard(puffle, user) {
        console.log(puffle.dataValues.type)

        switch (puffle.dataValues.type) {
            case 0:
                user.addSystemPostcard(100, puffle.dataValues.name)
                break
            case 1:
                user.addSystemPostcard(101, puffle.dataValues.name)
                break
            case 2:
                user.addSystemPostcard(102, puffle.dataValues.name)
                break
            case 3:
                user.addSystemPostcard(103, puffle.dataValues.name)
                break
            case 4:
                user.addSystemPostcard(104, puffle.dataValues.name)
                break
            case 5:
                user.addSystemPostcard(105, puffle.dataValues.name)
                break
            case 6:
                user.addSystemPostcard(106, puffle.dataValues.name)
                break
            case 7:
                user.addSystemPostcard(169, puffle.dataValues.name)
                break
            case 8:
                user.addSystemPostcard(109, puffle.dataValues.name)
                break
            case 9:
                user.addSystemPostcard(185, puffle.dataValues.name)
                break
        }
    }

    async adoptPuffle(args, user) {
        let type = args.type
        let name = args.name

        const puffleModel = this.crumbs["puffles"][type]

        if (!puffleModel) {
            user.send("error", { error: "Invalid puffle type." })
            return
        }

        let puffle = user.validatePurchase.puffle(type)

        if (!puffle) {
            return
        }

        let userPuffleCount = user.puffles.getHowManyPuffles()

        if (userPuffleCount >= 30) {
            user.send("error", {
                error: "You cannot adopt more than 30 puffles",
            })
            return
        }

        let puffleUser = user.puffles.add(type, name)

        user.updateCoins(-puffle.cost)
        user.send("adopt_puffle", { puffle: puffleUser.id, coins: user.coins })
        user.send("info", {
            message: "Your new puffle is now in your igloo.\nEnjoy!",
        })

        if (userPuffleCount >= 15) {
            user.addStamp(21)
        }

        user.addSystemPostcard(111, name)

        if (this?.handler?.elasticsearch) {
            await this.handler.elasticsearch.logPuffles(user, puffleUser.id, puffleModel.name, name, "adopt")
        }
    }

    async walkPuffle(args, user) {
        if (user.walking !== 0) {
            // player is already walking a puffle
            user.room.send(
                user,
                "stop_walking",
                {
                    user: user.id,
                    puffle: { type: user.walkingPuffleType, id: user.walking },
                },
                []
            )

            user.walking = 0
            user.walkingPuffleType = 0
            user.update({ walking: user.walking, walkingPuffleType: undefined })
        }

        if (args.puffle !== 0) {
            let walkingPuffleType = await this.db.puffles.findOne({
                where: { id: args.puffle },
                attributes: ["type", "userId", "name"],
            })

            if (
                walkingPuffleType == null ||
                walkingPuffleType.dataValues.userId != user.id
            ) {
                // tries to walk invalid puffle
                return
            }

            user.walking = args.puffle

            user.walkingPuffleType = walkingPuffleType.dataValues.type

            user.update({
                walking: user.walking,
                walkingPuffleType: user.walkingPuffleType,
            })
            user.room.send(
                user,
                "walk_puffle",
                {
                    user: user.id,
                    puffle: args.puffle,
                    type: user.walkingPuffleType,
                },
                []
            )

            if (this?.handler?.elasticsearch) {
                let puffleType = this.handler.crumbs.puffles[walkingPuffleType.dataValues.type].name
                await this.handler.elasticsearch.logPuffles(user, args.puffle, puffleType, walkingPuffleType.dataValues.name, "walk")
            }
        }
    }

    async stopWalking(args, user) {
        if (user.walking !== 0) {
            let iglooID = user.id + this.config.game.iglooIdOffset
            if (this.rooms[iglooID]) {
                // igloo is loaded in server

                if (user.room.id != iglooID) {
                    // player isn't in their own igloo, send to all other players in the room
                    this.rooms[iglooID].send(
                        user,
                        "stop_walking",
                        {
                            user: user.id,
                            puffle: {
                                type: user.walkingPuffleType,
                                id: user.walking,
                            },
                        },
                        []
                    )
                }
            }

            user.room.send(
                user,
                "stop_walking",
                {
                    user: user.id,
                    puffle: { type: user.walkingPuffleType, id: user.walking },
                },
                []
            )

            user.walking = 0
            user.update({ walking: user.walking, walkingPuffleType: undefined })
        }
    }

    async getPuffleType(args, user) {
        if (!args.puffle) {
            return
        }

        let puffleId = args.puffle
        let puffleType = await this.db.puffles.findOne({
            where: { id: puffleId },
            attributes: ["type"],
        })
        if (puffleType) {
            user.send("get_puffle_type", {
                penguinId: args.penguinId,
                type: puffleType.type,
                puffleId: puffleId,
            })
        }
    }

    async getWellbeing(args, user) {
        if (!args.puffle) {
            return
        }

        let puffleId = args.puffle
        let puffleWellbeing = await this.db.puffles.findOne({
            where: { id: puffleId },
            attributes: ["energy", "health", "rest", "name", "type", "userId"],
        })

        if ( puffleWellbeing && user.id !== puffleWellbeing.userId) return;

        if (puffleWellbeing) {
            user.send("get_wellbeing", {
                puffleId: puffleId,
                energy: puffleWellbeing.energy,
                health: puffleWellbeing.health,
                rest: puffleWellbeing.rest,
                name: puffleWellbeing.name,
                type: puffleWellbeing.type,
            })
        }
    }

    async buyPuffleItem(args, user) {
        if (!isNumber(args.puffleId) || !isNumber(args.item)) {
            return
        }

        const puffleId = args.puffleId
        let puffleItem = user.validatePurchase.puffleItem(args.item)

        if (!puffleItem) {
            return
        }

        user.updateCoins(-puffleItem.cost)
        user.send("buy_puffle_item", {
            puffleId: puffleId,
            item: args.item,
            coins: user.coins,
        })

        const puffle = await this.db.puffles.findOne({
            where: { id: puffleId },
        })

        if (!puffle) {
            return
        }

        let pufflEnergy = puffle.energy + 20
        if (pufflEnergy > 100) {
            pufflEnergy = 100
        }

        puffle.update({ energy: pufflEnergy })
        puffle.update({ last_feed: new Date() })
        puffle.update({ health: 100 })
        puffle.update({ postcard_hungry: 0 })
        this.sendPuffleWellbeing(puffleId, user)
        if (this?.handler?.elasticsearch) {
            let puffleType = this.handler.crumbs.puffles[puffle.type].name
            await this.handler.elasticsearch.logPuffles(user, puffle.id, puffleType, puffle.name, "care")
        }
    }

    async discardPuffle(args, user) {
        user.puffles.remove(args.puffle)
        user.send("discard_puffle", { puffle: args.puffle })
    }

    async updatePuffleEnergy(args, user) {
        if (!isNumber(args.puffle) || !isNumber(args.energy)) {
            return
        }

        const puffleId = args.puffle
        const energy = args.energy

        const puffle = await this.db.puffles.findOne({
            where: { id: puffleId },
        })

        if (!puffle) {
            return
        }

        if (user.id !== puffle.userId) return;

        const isInvulnerable = this.crumbs["puffles"][puffle.type].invulnerable

        if (isInvulnerable) {
            // Special Puffles
            return
        }

        var currentEnergy = puffle.energy
        currentEnergy += energy
        currentEnergy = Math.max(currentEnergy, 0);

        await puffle.update({ energy: currentEnergy })

        this.sendPuffleWellbeing(puffleId, user)
    }

    async sendPuffleWellbeing(puffleId, user) {
        if (!puffleId) {
            return
        }

        let puffleWellbeing = await this.db.puffles.findOne({
            where: { id: puffleId },
            attributes: ["energy", "health", "rest", "name", "type", "userId"],
        })

        if (puffleWellbeing && user.id !== puffleWellbeing.userId) return;

        if (puffleWellbeing) {
            user.send("update_wellbeing", {
                puffleId: puffleId,
                energy: puffleWellbeing.energy,
                health: puffleWellbeing.health,
                rest: puffleWellbeing.rest,
                name: puffleWellbeing.name,
                type: puffleWellbeing.type,
            })
        }
    }

    async updatePuffleRest(args, user) {
        if (!isNumber(args.puffle)) {
            return
        }

        const puffleId = args.puffle

        const puffle = await this.db.puffles.findOne({
            where: { id: puffleId },
        })

        if (!puffle) {
            return
        }

        if (user.id !== puffle.userId) return;

        const isInvulnerable = this.crumbs["puffles"][puffle.type].invulnerable

        if (isInvulnerable) {
            // Special Puffles
            return
        }

        puffle.update({ rest: 100 })
        puffle.update({ last_slept: new Date() })

        this.sendPuffleWellbeing(puffleId, user)
    }

    async checkPuffleHeatlh(args, user) {
        const puffles = await this.db.puffles.findAll({
            where: { userId: user.id },
        });

        for (let puffle of puffles) {
            if (puffle.dataValues.health < 20 && puffle.dataValues.health > 0 && !puffle.dataValues.postcard_hungry) {
              user.addSystemPostcard(110, puffle.dataValues.name)
              puffle.update({ postcard_hungry: 1 })
            }
        }
    }
}
