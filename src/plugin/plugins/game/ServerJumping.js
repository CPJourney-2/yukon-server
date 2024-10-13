import GamePlugin from '@plugin/GamePlugin'

import crypto from 'crypto'
import jwt from 'jsonwebtoken'

export default class ServerJumping extends GamePlugin {

    constructor(handler) {
        super(handler)

        this.events = {
            'server_jump': this.serverJump
        }

    }

    //this is copied from login plugin we should unify this i think
    async genLoginKey(user, randomKey) {
        let hash = user.createLoginHash(randomKey)

        return jwt.sign({
            hash: hash
        }, this.config.crypto.secret, { expiresIn: this.config.crypto.loginKeyExpiry })
    }

    async serverJump(args, user) {
        let randomKey = crypto.randomBytes(32).toString('hex')
        user.loginKey = await this.genLoginKey(user, randomKey)
        await user.save()
        
        user.send('server_jump', {
            'username': user.username,
            'key': randomKey
        })
    }

}
