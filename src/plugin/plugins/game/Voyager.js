import GamePlugin from '@plugin/GamePlugin';

export default class Voyager extends GamePlugin {
    constructor(handler) {
        super(handler);

        this.events = {
            'voyager_preview': this.getPreviewItems,
            'voyager_items': this.getRolledItems,
            'voyager_roll': this.rollItems,
            'voyager_reroll': this.rerollSingleItem,
            'voyager_packs': this.getGemPacks,
            'voyager_buy_pack': this.buyGemPack,
        };

        this.itemIDtoTier = this._getItemIDToTierMap();
    }

    async getPreviewItems(args, user) {
        if (!this._validateActiveVisit()) {
            return;
        }

        const randomItems = [];
        const minCount = Object.values(this.crumbs.voyager.tiers)
            .map(tier => tier.min_count).reduce((prev, curr) => prev + curr, 0);

        const allItems = Object.values(this.crumbs.voyager.tiers)
            .flatMap(tier => tier.items);

        while(randomItems.length < minCount) {
            const item = this._getRandomUniqueItem(allItems, randomItems);
            if (!item) {
                break;
            }
            
            randomItems.push(item);
        }

        user.send('voyager_preview', {items: randomItems.map(itemID => this._getItemObjectFromID(itemID))});
    }

    async getRolledItems(args, user) {
        if (!this._validateActiveVisit()) {
            return;
        }

        const items = await this.db.getVoyagerItems(user.id);
        const rerolls = await this.db.getVoyagerRerolls(user.id);
        
        user.send("voyager_items", { rerolls, items: items.map(id => this._getItemObjectFromID(id)) });
    }

    async rollItems(args, user) {
        if (!this._validateActiveVisit()) {
            return;
        }

        let items = await this.db.getVoyagerItems(user.id);

        if (items.length && user.rank < 2) {
            return;
        }
        
        await this.db.resetVoyagerRecord(user.id);
        const rerolls = await this.db.getVoyagerRerolls(user.id);

        const inventory = (await this.db.getInventory(user.id)).map(item => item.itemId) || [];
        items = this._getRandomVoyagerItems(inventory);
        this._shuffleArray(items);
        await this.db.setVoyagerItems(user.id, items);

        user.send('voyager_items', { rerolls, items: items.map(id => this._getItemObjectFromID(id)) });
    }

    async rerollSingleItem(args, user) {
        if (!this._validateActiveVisit()) {
            return;
        }

        const items = await this.db.getVoyagerItems(user.id);
        let rerolls = await this.db.getVoyagerRerolls(user.id);

        if (!items.length) {
            return;
        }

        if (!rerolls) {
            user.send('error', { error: "You do not have any rerolls left" });
            return;
        }

        const replacedItem = args.item;
        const replacedItemIndex = items.findIndex(item => item === replacedItem);
        if (!replacedItem || replacedItemIndex === -1) {
            return;
        }

        const inventory = (await this.db.getInventory(user.id)).map(item => item.itemId) || [];
        const rerolledItem = this._getRandomVoyagerItem([...inventory, ...items]);
        items[replacedItemIndex] = rerolledItem;

        await this.db.setVoyagerItems(user.id, items);
        await this.db.setVoyagerRerolls(user.id, rerolls - 1);

        user.send('voyager_reroll', { rerolls: rerolls - 1, replacedItem, rerolledItem: this._getItemObjectFromID(rerolledItem) });
    }

    async getGemPacks(args, user) {
        const gemPacks = this.crumbs.voyager.visit.gem_packs;
        user.send('voyager_packs', { gemPacks });
    }

    async buyGemPack(args, user) {
        if (!await this.db.isGemPackPurchasable(user.id)) {
            user.send('error', {error: 'You have already purchased gems for this visit'});
            return;
        }

        const packNumber = parseInt(args.packNumber);

        // invalid pack number
        if (!packNumber || packNumber <= 0 || packNumber > this.crumbs.voyager.visit.gem_packs.length) {
            return;
        }

        if (await this.db.isGemPackPurchased(user.id, packNumber)) {
            user.send('error', {error: 'You have already purchased this gem pack before'});
            return;
        }

        const gemPack = this.crumbs.voyager.visit.gem_packs[packNumber - 1];
        if (user.coins < gemPack.cost) {
            user.send('error', {error: 'You need more coins'});
            return;
        }

        await Promise.all([user.updateGems(gemPack.gems), user.updateCoins(-gemPack.cost)]);
        await this.db.setGemPackPurchased(user.id, packNumber);

        user.send('voyager_buy_pack', { coins: user.coins })
    }

// ================ Helpers ====================

    _validateActiveVisit() {
        return this.crumbs.voyager.visit.active >= 1;
    }

    // https://stackoverflow.com/a/12646864
    _shuffleArray(array) {
        for (let i = array.length - 1; i >= 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * 
     * @param {Array<int>} allItems 
     * @param {Array<int>} currItems 
     * @returns a random unique item, if there are no unique items left, returns undefined
     */
    _getRandomUniqueItem(allItems, currItems) {
        const uniqueItems = allItems.filter(item => !currItems.includes(item));
        if (!uniqueItems.length) {
            return;
        }

        return this._getRandomItem([...uniqueItems]);
    }
    
    _getRandomItem(allItems) {
        if (!Array.isArray(allItems) || !allItems.length)
            return;

        return allItems[Math.floor(Math.random() * allItems.length)];
    }

    _getRandomVoyagerItems(existingItems = []) {
        const generatedItems = [];
        const tiers = Object.keys(this.crumbs.voyager.tiers)
            .sort().map(tierID => this.crumbs.voyager.tiers[tierID]);

        // used in case someone already has all items from a tier, will force n unlocks from the next tier instead
        let forcedUnlocks = 0;

        tiers.forEach(tier => {
            const guarranteedUnlocks = [];
            const groupItemIDs = tier.items;

            // unlocked regardless of chance
            while (guarranteedUnlocks.length < (tier.min_count + forcedUnlocks)) {
                const item = this._getRandomUniqueItem(groupItemIDs, [...existingItems, ...guarranteedUnlocks]);
                if (!item) {
                    forcedUnlocks += tier.min_count - guarranteedUnlocks.length;
                    break; 
                }

                guarranteedUnlocks.push(item);
        }

            generatedItems.push(...guarranteedUnlocks);
            forcedUnlocks = Math.max(forcedUnlocks - guarranteedUnlocks.length, 0);

            // unlock additional items based on rarity chance and replace curr items to keep total fixed
            const extraUnlocks = [];
            let unlockTries = Math.max(tier.max_count - tier.min_count, 0);
            while (unlockTries > 0) {
                // unlock 1 item if random chance < rarityChance
                unlockTries -= 1;
                const randomChance = Math.random() * 100;
                if (randomChance >= tier.chance) {
                    continue;
                }
                
                const item = this._getRandomUniqueItem(groupItemIDs, [...existingItems, ...generatedItems, ...extraUnlocks]);

                if (!item) {
                    break;
                }

                extraUnlocks.push(item);
            }

            generatedItems.push(...extraUnlocks);
            generatedItems.splice(0, extraUnlocks.length);
        });
    
        return generatedItems;
    }

    _getRandomVoyagerItem(existingItems = []) {
        let generatedItem;
        const tiers = Object.keys(this.crumbs.voyager.tiers)
            .sort().map(tierID => this.crumbs.voyager.tiers[tierID]);

        // used in case someone already has all items from a tier, will force n unlocks from the next tier instead
        let forcedUnlock = false;

        tiers.forEach((tier, i) => {
            const groupItemIDs = tier.items;
            if (!generatedItem) {
                const item = this._getRandomUniqueItem(groupItemIDs, existingItems);
                generatedItem = item;
                return;
            }

            let unlockTries = Math.max(tier.max_count - tier.min_count, 0);
            while (unlockTries > 0) {
                // unlock 1 item if random chance < rarityChance
                unlockTries -= 1;
                const randomChance = Math.random() * 100;
                if (randomChance >= tier.chance && !forcedUnlock) {
                    continue;
                } else {
                    forcedUnlock = false;
                }
                
                let item = this._getRandomUniqueItem(groupItemIDs, [...existingItems, generatedItem]);

                if (!item) {
                    forcedUnlock = true;

                    if (i === tiers.length - 1) {
                        item = this._getRandomItem(groupItemIDs);
                    } else {
                        continue;
                    }
                }

                generatedItem = item;
            }
        });
    
        return generatedItem;
    }

    _getItemObjectFromID(itemID) {
        // check if crumbs have been updated
        const crumbsLength = Object.values(this.crumbs.voyager.tiers).reduce((lenSum, group) => lenSum + group.items.length, 0);
        const cacheLength = Object.values(this.itemIDtoTier);
        if (crumbsLength !== cacheLength) {
            this.itemIDtoTier = this._getItemIDToTierMap();
        }

        const item = this.crumbs.items[itemID];
        const tier = this.itemIDtoTier[itemID];

        return {
            item: itemID,
            name: item.name,
            type: item.type,
            slot: this.db.slots[item.type - 1],
            gem_cost: tier?.gem_cost || 0,
            rarity: tier?.rarity || 'common',
        };
    }

    _getItemIDToTierMap() {
        const tempMap = {};
        Object.values(this.crumbs.voyager.tiers).forEach(rarityGroup => {
            rarityGroup.items.forEach(itemID => tempMap[itemID] = rarityGroup);
        });

        return tempMap;
    }
}
