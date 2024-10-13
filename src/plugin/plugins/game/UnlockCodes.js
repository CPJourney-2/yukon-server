import GamePlugin from '@plugin/GamePlugin'

export default class UnlockCodes extends GamePlugin {

    constructor(handler) {
        super(handler)

        this.events = {
            'redeem_unlock_code': this.redeemUnlockCode
        }

		this.errors = {
			invalid: 'This code is invalid.',
			expired: 'This code has expired.',
			redeemed: 'This code has already been redeemed.',
			unknown: 'There was an error adding an item to your inventory. Please contact support if this error persists.'
		}
    }

    async redeemUnlockCode(args, user) {
		if (!args.code) return

		let codeObj = null

        // Check if unlock code exists
		for(let entry of this.crumbs.unlockcodes) {
			if(entry.code.toUpperCase() == args.code.toUpperCase()) {
				codeObj = entry
				break
			}
		}

		if (!codeObj) {
			return user.send('unlock_error', { error: this.errors.invalid })
		}

		// Check expiry on the code
		if(parseInt(codeObj.expiry) > 0) {
			const now = Date.now()
			const expiry = parseInt(codeObj.expiry) * 1000
	
			if (now >= expiry) return user.send('unlock_error', { error: this.errors.expired })
		}

		// Check if code has already been redeemed
		let codeRedeemed = await this.db.userUnlocks.findOne({ where: { userId: user.id, code: args.code } })
		if (codeRedeemed) {
			// A precaution incase code has redeemed but not all items were added
			let doesntOwnItems = false
			for(let item of codeObj.items) {
				if(!user.inventory.includes(item)) doesntOwnItems = true
			}
			if(!doesntOwnItems) return user.send('unlock_error', { error: this.errors.redeemed })
		}

		// Write in the database the unlock code entry
		await this.db.userUnlocks.create({ userId: user.id, code: args.code.toUpperCase() })

		// All checks passed, begin adding items
		for(let item of codeObj.items) {
			if(!user.inventory.includes(item)) {
				let crumb = this.crumbs.items[item]
				user.inventory.add(item);
				user.send('add_item', {
					item: item,
					name: crumb.name,
					slot: this.db.slots[crumb.type - 1],
					coins: user.coins,
					hide: true
				})
			}
		}

		// If code includes coins, then add those.
		if (codeObj.coins) user.updateCoins(codeObj.coins, false)
		
		user.send('unlock_code_reward', {
			items: codeObj.items,
			coins: codeObj.coins ?? 0
		})
    }

}
