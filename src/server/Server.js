import getSocketAddress from '@objects/user/getSocketAddress'
import UserFactory from '@objects/user/UserFactory'
import { error } from 'console'

import RateLimiterFlexible from 'rate-limiter-flexible'


export default class Server {

    constructor(id, users, db, handler, config, discord, redis) {
        this.id = id
        this.users = users
        this.db = db
        this.handler = handler
        this.config = config
        this.discord = discord
        this.redis = redis
        this.redis.setup(this);
        this.reconnectTimeouts = []
        this.excludedIPs = []

        let io = this.createIo(config.socketio, {
            cors: {
                origin: config.cors.origin,
                methods: ['GET', 'POST'],
                credentials: true,
                transports: ['websocket', 'polling'],
            },
            path: '/',
            parser: require("socket.io-msgpack-parser"),
            pingInterval: 25000,
            pingTimeout: 60000,
            connectionStateRecovery: {
                // the backup duration of the sessions and the packets
                maxDisconnectionDuration: 15 * 1000,
                // whether to skip middlewares upon successful recovery
                skipMiddlewares: true,
              }
        })

        if (config.rateLimit.enabled) {
            this.connectionLimiter = this.createLimiter(config.rateLimit.addressConnectsPerSecond)
            this.addressLimiter = this.createLimiter(config.rateLimit.addressEventsPerSecond)
            this.userLimiter = this.createLimiter(config.rateLimit.userEventsPerSecond)
        }

        this.server = io.listen(config.worlds[id].port)
        this.server.on('connection_error', (error) => console.error("connection error: ", error))
        this.server.on('connection', this.onConnection.bind(this))

    }

    createLimiter(points, duration = 1) {
        return new RateLimiterFlexible.RateLimiterMemory({
            points: points,
            duration: duration
        })
    }

    createIo(config, options) {
        let server = (config.https)
            ? this.httpsServer(config.ssl)
            : this.httpServer()

        return require('socket.io')(server, options)
    }

    httpServer() {
        return require('http').createServer()
    }

    httpsServer(ssl) {
        let fs = require('fs')
        let loaded = {}

        // Loads ssl files
        for (let key in ssl) {
            loaded[key] = fs.readFileSync(ssl[key]).toString()
        }

        return require('https').createServer(loaded)
    }

    async onConnection(socket) {
        let user

        if (this.handler.elasticsearch) {
            if (!this.handler.elasticsearch.ready) {
                console.log("Disconnecting user as ES has not yet connected.")
                return socket.disconnect(true) // disconnect as ES has not connected yet
            }
        }

        if (!this.config.rateLimit.enabled) {
            user = this.initUser(socket)
            return
        }

        let address = getSocketAddress(socket, this.config)

        this.connectionLimiter.consume(address)
            .then(() => {
                user = this.initUser(socket)

                if (this.id != "Login") {
                    setTimeout(async (user) => {
                        if (!user?.hasSentAuthPacket) {
                            delete this.reconnectTimeouts[user.socket.id]
                            return await user.close()
                        }
                    }, 1000, user)
                }
            })
            .catch((error) => {
                console.log(error)
                socket.disconnect(true)
            })
    }

    initUser(socket) {
        //console.log("user socket id:", this.users[socket.id])

        let user

        if(!socket.recovered) {
            user = UserFactory(this, socket)
    
            this.users[socket.id] = user
            console.log(`[${this.id}] [${new Date().toISOString()}] Connection from ${user.username} | ${user.socket.id} | ${user.address}`)
        } else {
            //console.log(`[${this.id}] [${new Date().toISOString()}] Recovering connection from ${user.username} | ${user.socket.id} | ${user.address}`)

            clearTimeout(this.reconnectTimeouts[socket.id])
            delete this.reconnectTimeouts[socket.id]

            if(!this.users.hasOwnProperty(socket.id)) {
                console.log("trying to emit close_with_error")
                //socket.emit('message', { action: 'close_with_error', args: {error: 'Connection was lost.\nPlease click to reload. (timeout)'} })
                socket.disconnect(true)
                return
            }

            user = this.users[socket.id]
            //console.log("recovered user:", user)

            console.log(`[${this.id}] [${new Date().toISOString()}] Recovered connection from ${user.username} | ${user.socket.id} | ${user.address}`)
        }

        socket.on('message', async (message) => await this.onMessage(message, user))
        socket.on('disconnect', async (reason) => await this.onDisconnect(user, reason))

        return user
    }

    async onMessage(message, user) {
        if (!this.config.rateLimit.enabled) {
            this.handler.handle(message, user)
            return
        }

        this.addressLimiter.consume(user.address)
            .then(async () => {

                let id = user.getId()

                if (message.action === "get_buddy") {
                    await this.handler.handle(message, user);
                    return;
                }

                this.userLimiter.consume(id)
                    .then(async () => {
                        await this.handler.handle(message, user)
                    })
                    .catch(() => {
                        // Blocked user
                    })

            })
            .catch(() => {
                // Blocked address
            })
    }

    async onDisconnect(user, reason) {
        console.log(`[${this.id}] [${new Date().toISOString()}] Disconnect from ${user.username} | ${user.socket.id} | ${user.address} | ${reason}`)
        if (user.id && this.handler.waitingQueue && this.handler.waitingQueueIds && user.id in this.handler.waitingQueue) {
            await this.handler.close(user);
            await this.handler.updateWaitingQueue();
            delete this.users[user.socket.id]
        } else {
            if(!user.closedConnection) this.reconnectTimeouts[user.socket.id] = setTimeout(async () => {
                console.log(`[${this.id}] [${new Date().toISOString()}] Did not reconnect ${user.username} | ${user.socket.id} | ${user.address}`)
                await this.handler.close(user)
                delete this.reconnectTimeouts[user.socket.id]
                delete this.users[user.socket.id]
            }, 20000)
        }
    }

    cleanupSocket(id, user) {
        console.log(`[${this.id}] [${new Date().toISOString()}] Cleaning up socket ${user.username} | ${user.socket.id} | ${user.address}`)
        if(this.reconnectTimeouts.hasOwnProperty(id)) {
            clearTimeout(this.reconnectTimeouts[id])
            delete this.reconnectTimeouts[id]
        }
        delete this.users[id]
    }

    onExit() {
        this.discord.closingAlert();
    }

}
