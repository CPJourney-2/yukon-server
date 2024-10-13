import GamePlugin from '@plugin/GamePlugin'
import { isNumber } from '@utils/validation'

export default class Transformations extends GamePlugin {

	constructor(handler) {
		super(handler)

		this.events = {
			'transform_player': this.transformPlayer,
			'revert_transform': this.revertTransform
		}
	}

	// the purpose of showForClient is so the !tf command can process properly (set to true by Chat.js)

	async transformPlayer(args, user, showForClient = false) {
		if (!args.transform || !isNumber(args.transform)) return

		let crumb = this.crumbs.transformations[args.transform]
		if (!crumb) return
		if (!crumb.active) return
		if (crumb.item) {
			if (!user.inventory.includes(crumb.item)) return
			await this.db['users'].update({ transform: args.transform }, { where: { id: user.id } })
		}

		user.updateTransform(args.transform, showForClient)
		if(!crumb.item) await this.db['users'].update({ transform: 0 }, { where: { id: user.id } })
	}

	async revertTransform(args, user, showForClient = false) {
		if (user.transform === 0) return
		await this.db['users'].update({ transform: 0 }, { where: { id: user.id } })
		user.updateTransform(0, showForClient)
	}
}
