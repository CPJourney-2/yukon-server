import BaseHandler from './BaseHandler'

export default class LoginHandler extends BaseHandler {

    constructor(id, users, db, config, discord, redis) {
        super(id, users, db, config, discord, redis)

        this.logging = false

        this.startPlugins('/login')
    }

}
