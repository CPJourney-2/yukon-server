import PluginManager from '@plugin/PluginManager'

import EventEmitter from 'events'
import config from "../../config/config.json"


export default class BaseHandler {

    constructor(id, users, db, config, discord, redis) {
        this.id = id
        this.users = users
        this.db = db
        this.config = config
        this.discord = discord
        this.redis = redis;
        this.elasticsearch;

        this.logging = true

        this.plugins

        this.events = new EventEmitter({ captureRejections: true })

        this.events.on('error', (error) => {
            this.error(error)
        })
    }

    startPlugins(pluginsDir = '') {
        this.plugins = new PluginManager(this, pluginsDir)
    }

    async handle(message, user) {
        try {
            if (this.logging) {
                if(message.action != 'send_key') {
                    console.log(`[${this.id}] [${new Date().toISOString()}] Received from ${user.username} | ${user.socket.id} | ${user.address} | ${message.action} ${JSON.stringify(message.args)}`)
                    // if (this.config?.elasticsearch?.enabled) {
                    //     await this.elasticsearch.log("network", {username: user.username, action: message.action, args: JSON.stringify(message.args), socket: user.socket.id, ip: user.address})
                    // }
                }
            }

            if (this.handleGuard(message, user)) {
                return await user.close()
            }

            this.events.emit(message.action, message.args, user)

            if (user.events) {
                user.events.emit(message.action, message.args, user)
            }

        } catch(error) {
            this.error(error)
        }
    }

    handleGuard(message, user) {
        return false
    }

    close(user) {
        delete this.users[user.socket.id]
    }

    error(error) {
        console.error(`[${this.id}] [${new Date().toISOString()}] ERROR: ${error.stack}`)
        this.discord.errorAlert(error)
    }

}
