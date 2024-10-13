import GamePlugin from '@plugin/GamePlugin'

import { hasProps, isString, isLength } from '@utils/validation'

import bcrypt from 'bcrypt'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { v4 as uuid } from 'uuid'


export default class GameAuth extends GamePlugin {

    constructor(handler) {
        super(handler)

        this.events = {
            'game_auth': this.gameAuth
        }
    }

    get redisPub() {
        return this.handler.redis.redisClient;
    }

    // Events

    async gameAuth(args, user) {
        if (!hasProps(args, 'username', 'key')) {
            return
        }

        if (!isString(args.username) || !isString(args.key)) {
            console.log(`[${this.handler.id}] [${new Date().toISOString()}] Malformed auth packet attempt from ${args.username} | ${user.socket.id} | ${user.address} | Closing session`)
            return await user.close()
        }

        if (args.username.includes(',')) {
            console.log(`[${this.handler.id}] [${new Date().toISOString()}] Malformed auth packet attempt from ${args.username} | ${user.socket.id} | ${user.address} | Closing session`)
            return await user.close()
        }

        if (!isLength(args.username, 1, 13)) {
            console.log(`[${this.handler.id}] [${new Date().toISOString()}] Malformed auth packet attempt from ${args.username} | ${user.socket.id} | ${user.address} | Closing session`)
            return await user.close()
        }

        if (user?.hasSentAuthPacket) {
            console.log(`[${this.handler.id}] [${new Date().toISOString()}] Multiple auth packet attempt for ${args.username} | ${user.socket.id} | ${user.address}`)
            return await user.close()
        }

        user.hasSentAuthPacket = true

        if (user.authenticated) {
            return
        }

        let load = await user.load(args.username)
        if (!load) {
            return await user.close()
        }

        if (user.ban || user.permaBan) {
            return await user.close()
        }

        if (args.key == null || args.key.length != 64) {
            return await user.close()
        }

        await this.compareLoginKey(args, user)
    }

    // Functions

    async compareLoginKey(args, user) {
        let decoded
        let token

        // Verify JWT
        try {
            decoded = jwt.verify(user.loginKey, this.config.crypto.secret)
        } catch (err) {
            console.log(`[${this.handler.id}] [${new Date().toISOString()}] Failed game authentication for ${args.username} | ${user.socket.id} | ${user.address} | Invalid JWT`)
            return await user.close()
        }

        // Verify hash
        let hash = user.createLoginHash(args.key)
        if (decoded.hash != hash) {
            console.log(`[${this.handler.id}] [${new Date().toISOString()}] Failed game authentication for ${args.username} | ${user.socket.id} | ${user.address} | Invalid Login Hash`)
            return await user.close()
        }

        // Remove login key from database
        user.update({ loginKey: null })

        // Set selector for token destruction
        if (args.token) {
            user.token.oldSelector = args.token
        }

        // Create new token
        if (args.createToken) {
            token = await this.genAuthToken(user)
        }

        const duplicateLogin = "You have been logged in from elsewhere!";

        // Disconnect globally.
        if (this.redisPub) {
            await this.redisPub.publish(
                "player-disconnect",
                JSON.stringify({origin: this.handler.id, userId: user.id, reason: duplicateLogin})
            );
        }

        // Disconnect if already logged in
        if (user.id in this.usersById) {
            this.usersById[user.id].close()
        }

        // Success
        this.usersById[user.id] = user

        user.authenticated = true

        // Send response
        let response = { success: true }
        if (token) {
            response.token = token
        }

        if (this.handler.population >= this.handler.maxUsers && !user.isModerator) {
            console.log(`[${this.handler.id}] [${new Date().toISOString()}] Queue join for ${args.username} | ${user.socket.id} | ${user.address}`)
            return await this.handler.addToWaitingQueue(user, response);
        }

        user.send('game_auth', response)
        console.log(`[${this.handler.id}] [${new Date().toISOString()}] Successful game authentication for ${args.username} | ${user.socket.id} | ${user.address}`)
    }

    async genAuthToken(user) {
        let selector = uuid()
        let validator = crypto.randomBytes(32).toString('hex')
        let validatorHash = await bcrypt.hash(validator, this.config.crypto.rounds)

        user.token.selector = selector
        user.token.validatorHash = validatorHash

        return `${selector}:${validator}`
    }

}
