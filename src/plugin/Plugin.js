export default class Plugin {

    constructor(handler) {
        this.handler = handler

        this.users = handler.users
        this.db = handler.db
        this.config = handler.config
        this.discord = handler.discord
    }

    get plugins() {
        return this.handler.plugins.plugins
    }

}
