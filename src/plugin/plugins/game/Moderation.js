import GamePlugin from '@plugin/GamePlugin'
import { isNumber, isString } from "@utils/validation"


export default class Moderation extends GamePlugin {

    constructor(handler) {
        super(handler)

        this.events = {
            'mute_player': this.mutePlayer,
            'unmute_player': this.unmutePlayer,
            'kick_player': this.kickPlayer,
            'ban_player': this.banPlayer,
            'get_unverified_users': this.getUnverifedUsers,
            'verify_user': this.verifyUser,
            'broadcast': this.broadcast,
            'reject_user': this.rejectUser,
            'toggle_invisibility': this.toggleInvisibility,
            'toggle_streamer': this.toggleStreamer,
            'send_warn': this.sendWarn,
            'set_rank': this.setRank
        }
    }

    async mutePlayer(args, user) {
        if (!isNumber(args.id)) return
        if (!isNumber(args.muteDuration)) return
        if (!isString(args.muteReason)) return

        if (user.rank < 3) {
            return user.send("error", { error: "You do not have permission to perform this action." })
        }

        let recipUser = await this.db.getUserById(args.id)
        if (!recipUser) return

        if (recipUser.rank >= user.rank) {
            user.send("error", { error: "This user is ranked higher than you, you cannot mute them." })
            return
        }

        if(await this.db.getActiveMute(args.id)) {
            return user.send('error', { error: `This player is already muted!` })
        }

        let expiry = (new Date()).getTime() + args.muteDuration
        await this.db.mute(args.id, expiry, user.id, args.permaMute, args.muteReason)

        let userName = recipUser.username

        const recipient = this.usersById[args.id];
        if (recipient) {
            recipient.muted = true
        }

        user.send('error', {
            error: `Player has been muted.`
        })

        if (this?.handler?.elasticsearch) {
            await this.handler.elasticsearch.logMod(user, "mute", args.id, userName)
        }

        this.discord.modLog(`**${user.username}** muted ${userName}. **Reason:** ${args.muteReason} **Length:** ${args.durationText}`,'mute')
    }

    async unmutePlayer(args, user) {
        if (user.dataValues.rank < 3) {
            user.send("error", {
                error: "You do not have permission to perform this action.",
            });
            return;
        }
        const id = args.id;
        let recipient = this.usersById[id];
        await this.db.unmute(args.id)
        if (recipient) {
            recipient.muted = false
        } else {
            recipient = await this.db.getUserById(args.id)
        }
        
        if (this?.handler?.elasticsearch) {
            await this.handler.elasticsearch.logMod(user, "unmute", args.id, recipient.username)
        }
        this.discord.modLog(`**${user.username}** UNmuted ${recipient.username} (${recipient.id}).`,'mute')
        user.send("error", {
            error: "User unmuted.",
        });
    }

    async getUnverifedUsers(args, user) {
        if (user.dataValues.rank < 4) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
			return
        }

        let users = await this.db.getUnverifedUsers()

        // Remove sensitive data
        for (let i = 0; i < users.length; i++) {
            users[i].loginKey = null
            users[i].password = null
        }

        if (users) {
            user.send('get_unverified_users', {
                users: users
            })
        }
    }

    async broadcast(args, user) {
        if (user.dataValues.rank < 4 || (args.mode == "devalert" && user.dataValues.rank < 5)) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
			return
        }

        if(args.thisRoomOnly) {
            user.room.send(
                user,
                'broadcast',
                {message: args.message, mode: args.mode},
                []
            );
            this.discord.modLog(`**${user.username}** broadcasted a **${args.mode}** to the **${user.room.name}**\n> ${args.message}`)
        } else {
            for (let userz of Object.values(this.handler.users)) {
                userz.send('broadcast', {message: args.message, mode: args.mode})
            }
            this.discord.modLog(`**${user.username}** broadcasted a **${args.mode}**\n> ${args.message}`)
        }
    }

    async verifyUser(args, user) {
        if (user.dataValues.rank < 4) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
			return
        }

        let recipient = this.usersById[args.id]
        if (recipient){
            recipient.send('info', {message: `Your username has been verified. Please refresh.`})
        }

        await this.db.verifyUser(args.id)

        this.getUnverifedUsers(args, user)

        if(args.fromModActions) {
            user.send('mod_update_name_status',{verify: true})
        }

        
        if (this?.handler?.elasticsearch) {
            await this.handler.elasticsearch.logMod(user, "verify_user", args.id, args.username)
        }

        this.discord.verifyLog(`${user.username} **approved** the username of **${args.username}** (${args.id})`)
    }

    async rejectUser(args, user) {
        if (user.dataValues.rank < 4) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
			return
        }

        await this.db.rejectUser(args.id)

        this.getUnverifedUsers(args, user)

        if(args.fromModActions) {
            user.send('mod_update_name_status',{reject: true})
        }

        if (this?.handler?.elasticsearch) {
            await this.handler.elasticsearch.logMod(user, "reject_user", args.id)
        }

        this.discord.verifyLog(`${user.username} **rejected** the username of **${args.username}** (${args.id})`)
        
    }


    kickPlayer(args, user) {

        if (!user.isModerator) {
            return
        }

        let recipient = this.usersById[args.id]

        if (recipient && recipient.rank < user.rank) {
            if(args.secretly == true) {
                recipient.close()
            }
            else if (args.kickReason == '' || args.kickReason == null){
                recipient.send('close_with_error', {error: `You have been kicked. Please make sure to follow the CPJ rules.`})
                recipient.close()
            }
            else{
                recipient.send('close_with_error', {error: `You have been kicked. Reason: ${args.kickReason}`})
                recipient.close()
            }
            
            recipient.close()
        }

        if (this?.handler?.elasticsearch) {
            this.handler.elasticsearch.logMod(user, "kick_user", args.id, recipient.username)
        }

        if (args.secretly == true) {
            this.discord.modLog(`**${user.username}** *secretly* kicked ${recipient.username} (${recipient.id})${args.kickReason == '' || args.kickReason == null ? '' : `. **Reason**: ${args.kickReason}`}`,'kick')
        }
        else if (args.kickReason == '' || args.kickReason == null){
            this.discord.modLog(`**${user.username}** kicked ${recipient.username} (${recipient.id})`,'kick')
        }
        else{
            this.discord.modLog(`**${user.username}** kicked ${recipient.username} (${recipient.id}). **Reason**: ${args.kickReason}`,'kick')
        }
    }

    async banPlayer(args, user) {
        if (!user.isModerator) {
            return
        }

        let recipient = this.usersById[args.id]

        if (!recipient) {
            return
        }

        let recipientRank = await this.getRecipientRank(recipient, args.id)

        if (recipientRank < user.rank) {
            await this.applyBan(user, args.id, 24, args.reason)

            recipient.send('close_with_error', {error: `You have been banned. Please make sure to follow the CPJ rules.`})
            recipient.close()
        }

        if (this?.handler?.elasticsearch) {
            await this.handler.elasticsearch.logMod(user, "ban", args.id, recipient.username)
        }

        this.discord.banLog(`**${user.username}** banned ${recipient.username} (${recipient.id}) via the playercard for 24 hours. Reason: ${args.reason}`)
    }

    async applyBan(moderator, id, hours = 24, message = '') {
        let expires = Date.now() + (hours * 60 * 60 * 1000)

        let banCount = await this.db.getBanCount(id)
        // 5th ban is a permanent ban
        if (banCount >= 4) {
            this.db.users.update({ permaBan: true }, { where: { id: id }})
        }

        this.db.bans.create({ userId: id, expires: expires, moderatorId: moderator.dataValues.id, message: message })
    }

    async getRecipientRank(recipient, id) {
        return (recipient)
            ? recipient.rank
            : (await this.db.getUserById(id)).rank
    }

    async toggleInvisibility(args, user) {
        if(user.rank < 4) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
            return
        }

        if(!user.isInvisible)
        {
            user.room.partialRemove(user)
            user.buddies.sendOffline()
        }

        user.wasInvisible = user.isInvisible
        user.isInvisible = !user.isInvisible

        // maybe do wasInvis? 
        if(!user.isInvisible) {
            user.buddies.sendOnlineToAll()
            this.plugins.join.joinRoom({ room: 1 }, user)
        } else {
            user.room.add(user)
            if(user.currentlySpectating != null) {
                let userz = this.usersById[user.currentlySpectating]
                if(userz) userz.spectators = userz.spectators.filter(id => id != user.id)
                user.currentlySpectating = null
            }
        }

        user.wasInvisible = user.isInvisible
    
        user.send('error', {
            error: `Invisibility has been set to: ${user.isInvisible}.`
        })
    }
    async toggleStreamer(_, user) {
        if(user.rank < 2) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
            return
        }

        await user.update({ streamer: !user.streamer })

        user.send('error', {
            error: `Streamer mode has been set to: ${user.streamer}.${user.streamer? ' To disable, click the skull button in the moderator menu by clicking mod badge.' : ''}`
        })
        user.send('toggle_streamer', { streamer: user.streamer })
    }
    async sendWarn(args, user, warnReason){

        if (!user.isModerator) {
            return
        }

        let recipient = this.usersById[args.id]
        try {
            if (recipient && recipient.rank < user.rank) {
                if (args.warnReason == '' ||args.warnReason == null){
                    recipient.send('error', {error: `You have been warned by a moderator. Please make sure to follow the CPJ rules.`})
                }
                else{
                    recipient.send('error', {error: `You have been warned by a moderator.\n Reason: ${args.warnReason}`})
                }
                
            }

            if (this?.handler?.elasticsearch) {
                await this.handler.elasticsearch.logMod(user, "warn", args.id, recipient.username)
            }

            if (args.warnReason == '' || args.warnReason == null){
                this.discord.modLog(`**${user.username}** warned ${recipient.username} (${recipient.id})`,'warn')
            }
            else{
                this.discord.modLog(`**${user.username}** warned ${recipient.username} (${recipient.id}). **Reason**: ${args.warnReason}`,'warn')
            }
        } catch {
            return
        }
    }

    async setRank(args, user) {
        if (user.rank < 8 || user.rank === 10) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
            return
        }

        let dbTarget = await this.db.getUserById(args.id)

        if (dbTarget) {
            await this.db.users.update({ rank: args.rank }, { where: { id: args.id }})

            let gameTarget = this.usersById[args.id]

            if (gameTarget) {
                gameTarget.rank = args.rank
                gameTarget.send('close_with_error', {error: 'Connection was lost.\nPlease click to reload.'})
                gameTarget.close()
            }

            user.send('error', {
                error: `${dbTarget.username} Rank has been set to ${args.rank}.`
            })

            if (this?.handler?.elasticsearch) {
                await this.handler.elasticsearch.logMod(user, "change_rank", args.id, dbTarget.username)
            }

            this.discord.modLog(`**${user.username}** set ${dbTarget.username} (${dbTarget.id})'s rank to ${args.rank}`, 'rank')
        }
    }

}
