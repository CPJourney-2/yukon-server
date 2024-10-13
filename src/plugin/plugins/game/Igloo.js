import GamePlugin from '@plugin/GamePlugin'

import { isNumber } from '@utils/validation'

const musicTracks = {
    //12187: [916, 1120, 1121, 1122],
    //12188: [1116, 1117, 1118, 1119],
    //12189: [717, 1133, 1134, 1135],
    //12190: [1123, 1124, 1125, 1126, 1127, 1128, 1129, 1130, 1131, 1132]
    12194: [1148, 1149, 1150, 1151, 1152, 1153, 1155, 1156, 1157]
}


export default class Igloo extends GamePlugin {

    constructor(handler) {
        super(handler)

        this.events = {
            'add_igloo': this.addIgloo,
            'add_furniture': this.addFurniture,
            'add_location': this.addLocation,
            'add_flooring': this.addFlooring,
            'add_music': this.addMusic,

            'update_igloo': this.updateIgloo,
            'remove_igloo': this.removeIgloo,
            'update_furniture': this.updateFurniture,
            'update_flooring': this.updateFlooring,
            'update_music': this.updateMusic,
            'update_location': this.updateLocation,

            'open_igloo': this.openIgloo,
            'close_igloo': this.closeIgloo,

            'get_igloos': this.getIgloos,
            'get_igloo_open': this.getIglooOpen,

            'get_igloo_likes': this.getIglooLikes,
            'like_igloo': this.likeIgloo,

            'open_igloo_bounds': this.openIglooBounds,
            'close_igloo_bounds': this.closeIglooBounds,

            'igloo_contest': this.iglooContest,
            'get_igloostore_items': this.getIglooStore,
            'get_store_music': this.getStoreMusic,
            'get_igloo_data': this.getIglooData,
            'change_igloo': this.changeIgloo,

            'jklashdfkjl': this.editorOpen,
            'kahsdfaas': this.editorClosed,
        }
    }

    // Events

    async addIgloo(args, user) {
        let igloo = user.validatePurchase.igloo(args.igloo)

        if (!igloo) {
            return
        }

        user.igloos.add(args.igloo)

        if(igloo.party_coins) {
            user.updatePartyCoins(-igloo.cost)
            user.send('add_party_coins', { partyCoins: user.partyCoins })
        } else {
            user.updateCoins(-igloo.cost)
        }

        user.send('add_igloo', { igloo: args.igloo, coins: user.coins })

        if (this?.handler?.elasticsearch) {
            await this.handler.elasticsearch.logItemPurchase(user, "igloo", null, args.igloo, igloo.name, igloo.cost)
        }
    }

    async addFurniture(args, user) {
        let furniture = user.validatePurchase.furniture(args.furniture,args.amount)

        if (!furniture) {
            return
        }

        // If furniture added successfuly
        if (user.furniture.add(args.furniture,args.amount)) {
            if(furniture.party_coins) {
                user.updatePartyCoins(-Math.floor(furniture.cost * args.amount))
                user.send('add_party_coins', { partyCoins: user.partyCoins })
            } else if (furniture.gems) {
                user.updateGems(-(Math.floor(furniture.gem_cost * args.amount)))
            } else {
                user.updateCoins(-(Math.floor(furniture.cost * args.amount)))
            }

            // Music Jam vinyls - Add to user's igloo music inventory
            if(musicTracks[args.furniture]) {
                let tracks = []
                let trackIds = []
                for(let music of musicTracks[args.furniture]) {
                    if(!user.music.includes(music)) {
                        tracks.push({ userId: user.id, musicId: music })
                        trackIds.push(music)
                    }
                }
                if(tracks.length > 0) {
                    await this.db.musicInventories.bulkCreate(tracks).then((arr) => {
                        for(let model of arr) {
                            user.music.collection[model[user.music.indexKey]] = model
                        }
                    })
                    user.send('add_furniture', { furniture: args.furniture, coins: user.coins, amount: args.amount, vinyl: true })
                    user.send('add_music', { music: trackIds, coins: user.coins, vinyl: true })
                    return
                }
            }


            user.send('add_furniture', { furniture: args.furniture, coins: user.coins, amount: args.amount })

            if (this?.handler?.elasticsearch) {
                await this.handler.elasticsearch.logItemPurchase(user, "furniture", furniture.type, args.furniture, furniture.name, furniture.cost, args.amount)
            }
        }
    }

    async addLocation(args, user) {
        let location = user.validatePurchase.location(args.location)

        if (!location) {
            return
        }

        user.locations.add(args.location)

        user.updateCoins(-location.cost)
        user.send('add_location', { location: args.location, coins: user.coins })

        if (this?.handler?.elasticsearch) {
            await this.handler.elasticsearch.logItemPurchase(user, "location", null, args.location, location.name, location.cost)
        }
    }

    async addFlooring(args, user) {
        let flooring = user.validatePurchase.flooring(args.flooring)

        if (!flooring) {
            return
        }

        user.flooring.add(args.flooring)

        user.updateCoins(-flooring.cost)
        user.send('add_flooring', { flooring: args.flooring, coins: user.coins })

        if (this?.handler?.elasticsearch) {
            await this.handler.elasticsearch.logItemPurchase(user, "flooring", null, args.flooring, flooring.name, flooring.cost)
        }
    }

    async addMusic(args, user) {
        let music = user.validatePurchase.music(args.music)

        if (!music) {
            return
        }

        user.music.add(args.music)

        user.updateCoins(-music.cost)
        user.send('add_music', { music: args.music, coins: user.coins })

        if (this?.handler?.elasticsearch) {
            await this.handler.elasticsearch.logItemPurchase(user, "music", null, args.music, music.name, music.cost)
        }
    }

    async updateIgloo(args, user) {
        let igloo = this.getIgloo(user.id)

        if (!igloo || igloo != user.room || igloo.type == args.type) {
            return
        }

        if (!user.igloos.includes(args.type)) {
            return
        }

        await igloo.clearFurniture()

        await igloo.update({ type: args.type, flooring: 0 })

        igloo.type = args.type
        igloo.flooring = 0

        // Refresh igloo
        igloo.refresh(user, true)
    }

    async removeIgloo(args, user) {
    
        let igloo = this.getIgloo(user.id)

        if (!igloo || igloo != user.room || igloo.type == args.type) {
            return
        }

        await igloo.clearFurniture()

        await igloo.update({ type: 1000 })
        await igloo.update({ flooring: 0 })

        igloo.type = 1000
        igloo.flooring = 0

        // Refresh igloo
        igloo.refresh(user)
    }

    async updateFurniture(args, user, slot=null) {
        
        if(slot == null) {
            slot = user.igloo_slot
        }

        if(user.updatingFurniture) {
            setTimeout(() => {
                this.updateFurniture(args, user, slot)
            }, 1000)
            return
        }
        user.updatingFurniture = true

        let igloo = this.getIgloo(user.id)
        if (slot != user.igloo_slot || !Array.isArray(args.furniture) || !igloo || igloo != user.room) {
            user.updatingFurniture = false
            return
        }

        await igloo.clearFurniture()

        let quantities = {}

        for (let item of args.furniture) {
            let id = item.furnitureId
            if (!item || !user.furniture.includes(id)) {
                continue
            }

            // Update quantity
            quantities[id] = (quantities[id]) ? quantities[id] + 1 : 1

            // Validate quantity
            if (quantities[id] > user.furniture.getQuantity(id)) {
                continue
            }

            igloo.furniture.push({ ...item, userId: user.id, slot: slot })
        }

        await this.db.furnitures.bulkCreate(igloo.furniture)
        await igloo.update({ iglooUpdated: new Date() })

        if(igloo.furniture.length >= 99) user.addStamp(23)

        user.updatingFurniture = false

        // Refresh igloo
        if (!args.change) {
            igloo.refresh(user)
        }

        if(user.slotToChangeIglooTo !== undefined && user.slotToChangeIglooTo !== null) {
            await this.changeIgloo({iglooId: user.slotToChangeIglooTo}, user)
        }
    }

    async updateFlooring(args, user) {
        let igloo = this.getIgloo(user.id)

        if (!igloo || igloo != user.room || igloo.flooring == args.flooring) {
            return
        }

        if (!user.flooring.includes(args.flooring)) {
            return
        }

        await igloo.update({ flooring: args.flooring })
        igloo.flooring = args.flooring

        for (const [_, user] of Object.entries(igloo.users)) {
            user.send('update_flooring', { flooring: args.flooring })
        }

        // Refresh igloo
        igloo.refresh(user)
    }

    async updateMusic(args, user) {
        let igloo = this.getIgloo(user.id)

        if (!igloo || igloo != user.room || igloo.music == args.music) {
            return
        }

        if (!user.music.includes(args.music)) {
            return
        }

        await igloo.update({ music: args.music })
        igloo.music = args.music

        for (const [_, user] of Object.entries(igloo.users)) {
            user.send('update_music', { music: args.music })
        }
    }

    async updateLocation(args, user) {
        if (!args?.location) return
        if (!isNumber(parseInt(args.location))) return

        args.location = parseInt(args.location)

        let igloo = this.getIgloo(user.id)
        if (!igloo || igloo != user.room) {
            return
        }

        if (!user.locations.includes(args.location)) return

        await igloo.update({ location: args.location })
        igloo.location = args.location

        for (const [_, user] of Object.entries(igloo.users)) {
            user.send('update_location', { location: args.location})
        }

        // Refresh igloo
        igloo.refresh(user)
    }

    async openIgloo(args, user) {
        let igloo = this.getIgloo(user.id)

        if (args.igloo && args.igloo == user.id) {
            if (!igloo) {
                // grab likes from db. this is from initial login so its likely igloo isn't loaded 
                let [myIglooLikes, _] = await this.db.getIglooLikes(user.id, user.igloo_slot)
                
                igloo = {}
                igloo.likes = myIglooLikes
            }

            this.openIgloos.add(user, igloo);
            user.send('igloo_open_status', {status: 1});
            return
        }

        if (igloo && igloo == user.room) {
            this.db.igloos.update({ locked: 0 }, {
                where: {
                    userId: user.id,
                    slot: user.igloo_slot
                }
            })

            this.openIgloos.add(user, igloo)
            user.send('igloo_open_status', {status: 1});
        }
    }

    closeIgloo(args, user) {
        let igloo = this.getIgloo(user.id)

        if (igloo && igloo == user.room) {
            this.db.igloos.update({ locked: 1 }, {
                where: {
                    userId: user.id,
                    slot: user.igloo_slot
                }
            })
            this.openIgloos.remove(user)
            user.send('igloo_open_status', {status: 0});
        }
    }

    async getIgloos(args, user) {
        let data = []

        this.openIgloos.list.forEach((igloo) => {
            let i = {}
            i.id = igloo.id
            i.username = igloo.username
            i.likes = igloo.igloo?.likes

            let iggyloo = this.getIgloo(igloo.id)

            // incase it doesn't update when changing slots
            if (iggyloo) {
                i.likes = iggyloo.likes
            } 

            data.push(i)
        })

        let [myIglooLikes, _] = await this.db.getIglooLikes(user.id, user.igloo_slot)

        user.send('get_igloos', { igloos: data, myIglooLikes: myIglooLikes})
    }

    getIglooOpen(args, user) {
        user.checkIndividualStamps()

        let open = this.openIgloos.includes(args.igloo)

        user.send('get_igloo_open', { open: open })
    }

    async getIglooLikes(args, user) {
        if (!user.room.isIgloo) return

        let igloo = user.room
        let iglooOwnerID = igloo.userId
        let iglooSlotID = igloo.slot

        let [likeCount, userLiked] = await this.db.getIglooLikes(iglooOwnerID, iglooSlotID, user.id)
        if (userLiked) user.send("igloo_liked")
        return igloo.send(user, 'get_igloo_likes', {likes: likeCount}, [])
    }

    async likeIgloo(args, user) {
        if (!user.room.isIgloo) return

        let igloo = user.room
        let iglooOwnerID = igloo.userId
        let iglooSlotID = igloo.slot

        igloo.likes += 1

        await this.db.likeUserIgloo(iglooOwnerID, user.id, iglooSlotID)

        await this.getIglooLikes({}, user)
        
        if (this.openIgloos.includes(igloo.userId)) {
            // add the correct igloo to the open igloos if it wasn't there previously
            let idx = this.openIgloos.list.findIndex(obj => obj.id === iglooOwnerID)

            let openIglooLocation = this.openIgloos.list[idx]

            // igloo wasn't previously loaded
            if (!openIglooLocation?.igloo?.userId) this.openIgloos.list[idx].igloo = igloo
        }

        return user.send('igloo_liked')
    }

    getIglooStore(args, user) {
        // Function to check if the item is new (added within the last 8 days)
        const isNewItem = (timeAdded) => {
            if (timeAdded === undefined) {
                return 0;
            }
    
            const currentTime = Math.floor(Date.now() / 1000);
            const eightDaysInSeconds = 8 * 24 * 60 * 60;
            return (currentTime - timeAdded <= eightDaysInSeconds) ? 1 : 0;
        };
    
        // Get available igloo store items
        const getAvailableItems = (items) => {
            return Object.keys(items)
                .filter(key => items[key].store === 1)
                .map(key => {
                    return {
                        ...items[key],
                        id: key,
                        new: isNewItem(items[key].timeAdded)
                    };
                });
        };
    
        let availableFurniture = getAvailableItems(this.crumbs.furnitures);
        let availableIgloos = getAvailableItems(this.crumbs.igloos);
        let availableFloorings = getAvailableItems(this.crumbs.floorings);
        let availableLocations = getAvailableItems(this.crumbs.locations);
    
        if (user) {
            user.send('get_igloostore_items', {
                furniture: availableFurniture,
                flooring: availableFloorings,
                igloo: availableIgloos,
                location: availableLocations
            });
        }
    }

    getStoreMusic(args, user) {
        // Function to check if the item is new (added within the last 8 days)
        const isNewItem = (timeAdded) => {
            if (timeAdded === undefined) {
                return 0;
            }
    
            const currentTime = Math.floor(Date.now() / 1000);
            const eightDaysInSeconds = 8 * 24 * 60 * 60;
            return (currentTime - timeAdded <= eightDaysInSeconds) ? 1 : 0;
        };

        // get available igloo store items
        const getAvailableItems = (items) => {
            return Object.keys(items)
                .filter(key => items[key].store === 1)
                .map(key => {
                    return {
                        ...items[key],
                        id: key,
                        new: isNewItem(items[key].timeAdded)
                    };
                });
        };

        let availableMusic = getAvailableItems(this.crumbs.music);

        if (user) {
            user.send('get_store_music', {
                music: availableMusic,
            });
        }
    }

    openIglooBounds(args, user) {
        let igloo = this.getIgloo(user.id)

        if (igloo && igloo == user.room) {
            this.db.igloos.update({ boundaries: 0 }, {
                where: {
                    userId: user.id,
                    slot: user.igloo_slot
                }
            })
            user.send('igloo_bounds_status', {status: 0});
        }
    }

    closeIglooBounds(args, user) {
        let igloo = this.getIgloo(user.id)

        if (igloo && igloo == user.room) {
            this.db.igloos.update({ boundaries: 1 }, {
                where: {
                    userId: user.id,
                    slot: user.igloo_slot
                }
            })
            user.send('igloo_bounds_status', {status: 1});
        }
    }

    async getIglooData(args, user) {
        let igloos = await this.db.getIgloos(user.id)

        if (igloos) {
            user.send('get_igloo_data', {igloos: igloos, current_slot: user.igloo_slot})
        }
    }

    async changeIgloo(args, user) {
        if (args.iglooId > 2 || args.iglooId < 0) return;
        if(user.updatingFurniture) {
            user.slotToChangeIglooTo = args.iglooId
            return
        }

        user.igloo_slot = args.iglooId
        user.update({igloo_slot: user.igloo_slot})
        let igloo = this.getIgloo(user.id)
        if (igloo) {
            await igloo.changeIgloo(user.igloo_slot, user)
        }
        user.slotToChangeIglooTo = null
    }

    // Functions

    getIgloo(id) {
        let iglooId = id + this.config.game.iglooIdOffset

        if (iglooId in this.rooms) {
            return this.rooms[iglooId]
        }
    }

    async iglooContest(args, user) {
        let hasSubmitted = await this.db.hasUserSubmittedIglooContest(user.id)
        if(!hasSubmitted) {
            await this.db.userIglooContest(user.id)
            this.discord.iglooContestAlert(user)
            user.send('info', { message: 'Thank you for submitting! Please remember to not change your igloo for at least 72 hours.' })
        } else {
            user.send('error', { error: 'You have already submitted your igloo for this contest.' })
        }
    }

    editorOpen(args, user) {
        if (this?.handler?.elasticsearch) {
            if (user) user.iglooEditStart = Date.now();
        }
    }

    editorClosed(args, user) {
        if (this?.handler?.elasticsearch) {
            if (user && user.iglooEditStart) {
                let timeInEditor = (Date.now() - user.iglooEditStart) / 1000
                this.handler.elasticsearch.iglooEditLog(user, timeInEditor)
            }
        }
    }
}
