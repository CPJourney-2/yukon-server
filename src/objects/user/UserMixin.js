import getSocketAddress from './getSocketAddress'

import crypto from 'crypto'
import { Op } from 'sequelize'


export default {

    init(server, socket) {
        this.server = server
        this.socket = socket

        this.db = server.db
        this.handler = server.handler
        this.config = server.config

        this.address = getSocketAddress(socket, this.config)

        this.isMuted = false
        this.isModerator = false
        this.requestedLogin = false
        this.closedConnection = false
    },

    send(action, args = {}) {
        this.socket.emit('message', { action: action, args: args })
    },

    async close() {
        await this.handler.close(this)
        this.socket.disconnect(true)
        //console.log("closing server-side")
        /*clearTimeout(this.reconnectTimeouts[this.socket.id])
        delete this.reconnectTimeouts[this.socket.id]*/
    },

    getId() {
        return (this.id) ? this.id : this.socket.id
    },

    createLoginHash(randomKey) {
        let userAgent = this.socket.request.headers['user-agent']
        let string = `${this.username}${randomKey}${this.address}${userAgent}`

        return crypto.createHash('sha256').update(string).digest('hex')
    },

    async load(username, selector = null) {
        return await this.reload({
            where: {
                username: username
            },

            include: [
                {
                    model: this.db.authTokens,
                    as: 'authToken',
                    where: {
                        selector: selector
                    },
                    required: false
                },
                {
                    model: this.db.bans,
                    as: 'ban',
                    where: {
                        expires: {
                            [Op.gt]: Date.now()
                        }
                    },
                    required: false
                }
            ],

            order: [
                ['ban', 'expires', 'desc']
            ]

        }).then(() => {
            this.setPermissions()

            return true

        }).catch((error) => {
            //this.handler.error(error)

            return false
        })
    },

    setPermissions() {
        this.isModerator = this.rank >= 2
    }

}
