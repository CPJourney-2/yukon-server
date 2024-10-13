import GamePlugin from '@plugin/GamePlugin'

import { isString } from "@utils/validation"


export default class PopupInteractions extends GamePlugin {

    constructor(handler) {
        super(handler)

        this.events = {
            'set_interaction': this.setInteraction,
        }
    }

    async setInteraction(args, user) {
        if (!isString(args.interaction)) return
        if (user.popupInteractions.interactionNames.includes(args.interaction)) return

        user.popupInteractions.add(args.interaction)
    }
}
