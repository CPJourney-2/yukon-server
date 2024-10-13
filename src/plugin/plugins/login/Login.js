import Plugin from '@plugin/Plugin'

import { hasProps, isString } from '@utils/validation'

import bcrypt from 'bcrypt'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import Validator from 'fastest-validator'


export default class Login extends Plugin {

    constructor(handler) {
        super(handler)

        this.events = {
            'login': this.login,
            'token_login': this.tokenLogin
        }

        this.check = this.createValidator()

        this.responses = {
            notFound: {
                success: false,
                message: 'Penguin not found. Try Again?'
            },
            wrongPassword: {
                success: false,
                message: 'Incorrect password. NOTE: Passwords are CaSe SeNsiTIVE'
            },
            wrongSession: {
                success: false,
                message: 'Expired session. Please type in your password again'
            },
            permaBan: {
                success: false,
                message: 'Banned:\nYou are banned forever'
            },
            staffOnly: {
                success: false,
                message: 'Club Penguin Journey is currently being updated, you cannot log in at this time. Please try again later'
            },
            noSecret: {
                success: false,
                message: 'An internal error has occured while validating your login information'
            }
        }
    }

    // Events

    async login(args, user) {
        if(user.requestedLogin) return;
        user.requestedLogin = true;
        let check = this.check({ username: args.username, password: args.password })
        user.secret = args.secret

        if(!args.secret) {
            user.send('login', this.responses.noSecret)
        } else if (check != true) {
            // Invalid data input
            user.send('login', {
                success: false,
                message: check[0].message
            })

        } else {
            // Comparing password and checking for user existence
            user.send('login', await this.comparePasswords(args, user))
        }

        await user.close()
    }

    async tokenLogin(args, user) {
        if(user.requestedLogin) return;
        user.requestedLogin = true;
        user.secret = args.secret
        if(!args.secret) {
            user.send('login', this.responses.noSecret)
            await user.close()
            return
        }

        user.send('login', await this.compareTokens(args, user))

        await user.close()
    }

    // Functions

    createValidator() {
        let validator = new Validator()

        let schema = {
            username: {
                empty: false,
                trim: true,
                type: 'string',
                min: 1,
                max: 13,
                messages: {
                    stringEmpty: 'You must provide your Penguin Name to enter Club Penguin',
                    stringMin: 'Your Penguin Name is too short. Please try again',
                    stringMax: 'Your Penguin Name is too long. Please try again',
                }
            },
            password: {
                empty: false,
                trim: true,
                type: 'string',
                min: 3,
                max: 128,
                messages: {
                    stringEmpty: 'You must provide your password to enter Club Penguin',
                    stringMin: 'Your password is too short. Please try again',
                    stringMax: 'Your password is too long. Please try again'
                }
            }
        }

        return validator.compile(schema)
    }

    async comparePasswords(args, user) {
        let load = await user.load(args.username)
        if (!load) {
            return this.responses.notFound
        }

        let match = await bcrypt.compare(args.password, user.password)
        if (!match) {
            console.log(`[Login] [${new Date().toISOString()}] Failed sign-in for ${args.username} | ${user.socket.id} | ${user.address} | Wrong password`)
            return this.responses.wrongPassword
        }

        let banned = await this.checkBanned(user)
        if (banned) {
            return banned
        }

        if (await this.db.isMaintenance() && user.rank < 2) {
            return this.responses.staffOnly
        }

        console.log(`[Login] [${new Date().toISOString()}] Successful sign-in for ${args.username} | ${user.socket.id} | ${user.address} | Password sign-in`)

        return await this.onLoginSuccess(user)
    }

    async compareTokens(args, user) {
        if (!hasProps(args, 'username', 'token')) {
            return this.responses.wrongSession
        }

        if (!isString(args.token)) {
            return this.responses.wrongSession
        }

        let split = args.token.split(':')
        if (split.length != 2) {
            return this.responses.wrongSession
        }

        let load = await user.load(args.username, split[0])
        if (!load) {
            return this.responses.notFound
        }

        if (!user.authToken) {
            return this.responses.wrongSession
        }

        let match = await bcrypt.compare(split[1], user.authToken.validator)
        if (!match) {
            return this.responses.wrongSession
        }

        let banned = await this.checkBanned(user)
        if (banned) {
            return banned
        }

        if (await this.db.isMaintenance() && user.rank < 2) {
            return this.responses.staffOnly
        }

        console.log(`[Login] [${new Date().toISOString()}] Successful sign-in for ${args.username} | ${user.socket.id} | ${user.address} | Token sign-in`)

        return await this.onLoginSuccess(user)
    }

    async checkIPBanned(user) {
        await this.db.insertFingerprint(user.id, user.address, user.secret)

        let bannedUsers = await this.db.getBannedUsersForFingerprint(user.address, user.secret)
        if(bannedUsers.length > 0) {
            //ensure this account is also marked as IP banned
            await this.db.ipBan(user.id, this.discord)

            let usernames = []
            bannedUsers.forEach((bannedUser) => {usernames.push(bannedUser.username)})

            this.discord.banLog(`**${user.username}** has been automatically banned due to its association with the following users: ${usernames}`,false,true)

            return true
        }else{
            return false
        }
    }

    async checkBanned(user) {
        let ipBan = await this.checkIPBanned(user)

        if (user.permaBan || ipBan) {
            //let banReason = this.db.getBanReason(user.id)
            return {
                success:false,
                message: `${this.responses.permaBan.message}${user.ban ? `\n(${user.ban.message})` : ``}`
            }
        }

        if (!user.ban) {
            return
        }

        let hours = Math.round((user.ban.expires - Date.now()) / 60 / 60 / 1000)
        return {
            success: false,
            message: `Banned:\nYou are banned for the next ${hours} hours${user.ban.message ? `\n(${user.ban.message})` : ``}`
        }
    }

    async onLoginSuccess(user) {
        // Generate random key, used by client for authentication
        let randomKey = crypto.randomBytes(32).toString('hex')
        // Generate new login key, used to validate user on game server
        user.loginKey = await this.genLoginKey(user, randomKey)

        let populations = await this.getWorldPopulations(user.isModerator)

        this.discord.userLog(`**${user.username}** has successfully logged in!`);

        // All validation passed
        await user.save()
        return {
            success: true,
            username: user.username,
            key: randomKey,
            populations: populations
        }
    }

    async genLoginKey(user, randomKey) {
        let hash = user.createLoginHash(randomKey)

        return jwt.sign({
            hash: hash
        }, this.config.crypto.secret, { expiresIn: this.config.crypto.loginKeyExpiry })
    }

    async getWorldPopulations(isModerator) {
        let pops = await this.db.getWorldPopulations()
        let populations = {}

        for (let world of Object.keys(pops)) {
            let maxUsers = this.config.worlds[world].maxUsers
            let population = pops[world].population

            if (population >= maxUsers) {
                populations[world] = (isModerator) ? 5 : 6
                continue
            }

            //let barSize = Math.round(maxUsers / 5)
            
            // Improvement dedicated to: amman
            let barSize = 50

            let bars = (population > (barSize * 5)) ? 5 : (Math.max(Math.ceil(population / barSize), 1) || 1)

            populations[world] = bars
        }

        return populations
    }

}
