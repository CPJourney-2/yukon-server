import GamePlugin from '@plugin/GamePlugin'

export default class ModPanel extends GamePlugin {

    constructor(users, rooms) {
        super(users, rooms)
        this.events = {
            'get_user_info': this.getUserInfo,
            'get_user_info_by_id': this.getUserInfoById,
            'edit_player': this.editPlayer,
            'add_user_items': this.addUserItems,
            'remove_user_items': this.removeUserItems,
            'add_user_furniture': this.addUserFurniture,
            'ban_user': this.banUser,
            'change_user_name': this.changeUsername,
            'activate_user': this.activateUser,
            //'show_alts': this.showAlts,
            //'show_alts_plus': this.showAltsPlus,
            'get_alts': this.getAlts,
            'get_alts_plus': this.getAltsPlus,
            'add_coins': this.addCoins,
            'make_potw': this.makePotw,
            'unban': this.unban,
            'unban_ip': this.unbanIP,
            'teleport_to_player': this.teleportToPlayer,
            'warn_user': this.warnUser,
            'send_sys_mail': this.publishUser,
            'send_infobox': this.sendInfoBox,
        }
    }

    async getUserInfo(args, user) {

        if (user.rank < 4) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
			return
        }

        let users = await this.db.searchForUsers(args.username)

        // Remove sensitive data
        for (let i = 0; i < users.length; i++) {
            users[i].loginKey = null
            users[i].password = null
        }

        if (users) {
            user.send('get_unverified_users', {
                users: users,
                usersearch: true
            })
        }

    }

    async getUserInfoById(args, user) {

        if (user.rank < 4) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
			return
        }

        let users = await this.db.getUserById(args.id)
        user.send('get_unverified_users', {
            users: users || false,
            usersearch: true,
            searchbyid: true
        })

    }

    async editPlayer(args, user) {

        if (user.rank <3) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
			return
        }

        let request = await this.db.getUserById(args.id)

        request.loginKey = null
        request.password = null

        let bans = await this.db.getBanCount(args.id)
        let activeban =  await this.db.getActiveBan(args.id)
        let banReason = await this.db.getBanReason(args.id)

        let banHistory = await this.db.getAllBans(args.id)
        for(let i = 0; i < banHistory.length; i++) {
            if(banHistory[i].moderatorId === args.id) { // If mod id == banned user's id, then read as auto ban
                banHistory[i].moderatorId = '[AUTOMATIC BAN]'
            } else {
                banHistory[i].moderatorId = (await this.db.getUserById(banHistory[i].moderatorId)).username
            }
        }

        let muteRaw = await this.db.getActiveMute(args.id)
        let muteHistory = await this.db.getAllMutes(args.id)
        let muter = muteRaw?.moderatorId ? (await this.db.getUserById(muteRaw.moderatorId)).username : null
        
        await Promise.all(muteHistory.map(async record => {
            record.moderatorId = record.moderatorId
                ? (await this.db.getUserById(record.moderatorId)).username
                : 'UNKNOWN';
        }));

        /*if(this.usersById[args.id]) {
            if(request.rank > 1) request.invisible = this.usersById[args.id].isInvisible
        }*/

        if (request) {
            user.send('edit_player', {
                user: request,
                bancount: bans,
                activeban: activeban,
                banReason: banReason,
                muteInfo: {data:muteRaw, reason: muteRaw?.message, moderator:muter, muteHistory},
                banHistory: banHistory
            })
        }
    }

    async addUserItems(args, user) {

        if (user.rank < 6 || user.rank > 9) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
			return
        }

        let userName = (await this.db.getUserById(args.id)).username

        // this.discord.addItemLogs(user.username, userName, args.itemName)

        let recipient = this.usersById[args.id]

        args.item = parseInt(args.item)

        if (recipient) {
            let item = this.crumbs.items[args.item]
            recipient.inventory.add(args.item)
            recipient.send('add_item', { item: args.item, name: args.itemName, slot: this.db.slots[item.type - 1], coins: recipient.coins })
            user.send('error', {
                error: 'Item added successfully.'
            })
        }
        else {
            let item = this.db.addItem(args.id, args.item)

            if (item) {
                user.send('error', {
                    error: 'Item added successfully.'
                })
            }
        }

        if (this?.handler?.elasticsearch) {
            await this.handler.elasticsearch.logMod(user, "add_item", args.id, userName)
        }

        this.discord.addItemLog(`**${user.username}** added ${args.itemName} to ${userName}`)
    }

    async removeUserItems(args, user) {

        if (user.rank < 6) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
			return
        }

        let userName = (await this.db.getUserById(args.id)).username

        let recipient = this.usersById[args.id]

        args.item = parseInt(args.item)

        let hasItem = await this.db.userHasItem(args.id,args.item)
        if(!hasItem) return user.send('error', {
            error: 'The user does not have this item.'
        })

        if (recipient) {
            recipient.inventory.remove(args.item)
            let item = this.db.removeItem(args.id, args.item)
            //recipient.send('add_item', { item: args.item, name: args.itemName, slot: this.db.slots[item.type - 1], coins: recipient.coins })
            if(item) user.send('info', {
                message: 'Item removed successfully. This will not take effect for the user until they relogin.'
            })
        }
        else {
            let item = this.db.removeItem(args.id, args.item)

            if (item) {
                user.send('info', {
                    message: 'Item removed successfully.'
                })
            }
        }

        if (this?.handler?.elasticsearch) {
            await this.handler.elasticsearch.logMod(user, "remove_item", args.id, userName)
        }

        this.discord.addItemLog(`**${user.username}** *removed* ${args.itemName} from ${userName}`)
    }

    async addUserFurniture(args, user) {

        if (user.rank < 6) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
			return
        }

        let userName = (await this.db.getUserById(args.id)).username

        let recipient = this.usersById[args.id]

        args.item = parseInt(args.item)

        if(!args.units || isNaN(args.units) || args.units < 1) {
            args.units = 1
        } else if(args.units > 99) {
            args.units = 99
        } else {
            args.units = args.units
        }

        if (recipient) {
            if(recipient.furniture.add(args.item,args.units)) {
                recipient.send('add_furniture', { furniture: args.item, coins: recipient.coins, amount: args.units })
                user.send('error', {
                    error: 'Furniture added successfully.'
                })
                this.discord.addItemLog(`**${user.username}** added ${args.units} units of ${args.itemName} to ${userName}`)
            }
        }
        else {
            let item = this.db.addFurniture(args.id, args.item, args.units)

            if (item) {
                user.send('error', {
                    error: 'Furniture added successfully.'
                })
                this.discord.addItemLog(`**${user.username}** added ${args.units} units of ${args.itemName} to ${userName}`)
            }
        }

        if (this?.handler?.elasticsearch) {
            await this.handler.elasticsearch.logMod(user, "add_furniture", args.id, userName)
        }

        //this.discord.addItemLog(`**${user.username}** added ${args.units} units of ${args.itemName} to ${userName}`)
    }

    async banUser(args, user) {
        if (user.rank < 3) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
			return
        }
        if(user.rank < 4 && args.durationText !== "3 hours" && args.durationText !== "1 day") return
        let recipient = this.usersById[args.id]
        let recipientRank = await this.getRecipientRank(recipient, args.id)

        if (recipientRank < user.rank) {
            let date = new Date()
            let expiry = date.getTime() + args.banDuration
            await this.db.ban(args.id, expiry, user.id, args.permaBan, args.banReason)

            if(args.ipBan) await this.db.ipBan(args.id, this.discord)

            let userName = (await this.db.getUserById(args.id)).username
            let expiryDate = new Date(expiry)
            if(recipient) {
                if(args.permaBan) {
                    recipient.send('close_with_error', {error: `You have been banned forever. Please make sure to follow the CPJ rules.${args.banReason ? `\n(${args.banReason})` : ``}`})
                    recipient.close()
                } else {
                    recipient.send('close_with_error', {error: `You have been banned until ${expiryDate.toUTCString()}. Please make sure to follow the CPJ rules.${args.banReason ? `\n(${args.banReason})` : ``}`})
                    recipient.close()
                }
            }

            user.send('error', {
                error: `Player banned until ${expiryDate.toUTCString()}`
            })

            if (this?.handler?.elasticsearch) {
                await this.handler.elasticsearch.logMod(user, "ban", args.id, userName)
            }

           // this.discord.banLogs(user.username, userName, args.durationText, expiryDate.toUTCString())
           this.discord.banLog(`**${user.username}** banned ${userName} for ${args.durationText}. **Reason:** ${args.banReason}`, (args.ipBan ? false : args.permaBan), args.ipBan)
        }

        else {
            user.send('error', {
                error: 'This user has the same permission level as you.'
            })
        }     
    }

    async changeUsername(args, user) {

        if (user.rank < 6) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
			return
        }

        let userName = (await this.db.getUserById(args.id)).username

        let complete = await this.db.changeUsername(args.id, args.newUsername)

        if (complete) {
            user.send('error', {
                error: 'Username changed successfully.'
            })

            if (this?.handler?.elasticsearch) {
                await this.handler.elasticsearch.logMod(user, "change_name", args.id, args.newUsername)
            }

            // this.discord.changeUsernameLogs(user.username, userName, args.newUsername)
            this.discord.modLog(`**${user.username}** changed ${userName}'s username to ${args.newUsername}`)
        }

    }

    async getRecipientRank(recipient, id) {
        return (recipient)
            ? recipient.rank
            : (await this.db.getUserById(id)).rank
    }

    async activateUser(args, user) {

        if (user.rank < 4) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
            return
        }

        let userName = (await this.db.getUserById(args.id)).username

        let complete = await this.db.activateUser(args.id)

        if (complete) {
            user.send('error', {
                error: 'User activated successfully.'
            })

            if (this?.handler?.elasticsearch) {
                await this.handler.elasticsearch.logMod(user, "activate_user", args.id, userName)
            }

        }else {
            user.send('error', {
                error: 'User is already activated.'
            })
        }

    }

    /*async showAlts(args, user) {
        if (user.rank < 4) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
            return
        }

        var alts = await this.db.getAlts(args.id)
        if(alts.size == 0) {
            user.send('error', {
                error: 'No accounts have been found.'
            })
        }

        var usernames = alts.map(user => user.username)
        user.send('error', {
            error: usernames.join(', ')
        })
    }*/

    async getAlts(args, user) {
        if (user.rank < 4) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
            return
        }

        var alts = await this.db.getAlts(args.id)
        if(alts.size == 0) {
            return 'ERR: No alts found'
        }

        const activeBannedIDs = await this.db.getActiveBannedIDs(alts.map(user => user.id));
        const altsInfo = alts.map(user => { return {
            username: user.username,
            permaBan: user.permaBan || user.ipBan,
            muted: user.muted,
            activeBan: activeBannedIDs.includes(user.id)
        }});
        user.send('get_alts', {altsInfo});
    }

    async getAltsPlus(args, user) {
        if (user.rank < 4) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
            return
        }

        let alts = await this.db.getAltsPlus(args.id)
        if(alts.size == 0) {
            return 'ERR: No alts found'
        }

        alts = Array(...alts.keys());
        const activeBannedIDs = await this.db.getActiveBannedIDs(alts.map(user => user.id));
        const altsInfo = alts.map(user => { return {
            username: user.username,
            permaBan: user.permaBan,
            muted: user.muted,
            activeBan: activeBannedIDs.includes(user.id)
        }});
        user.send('get_alts',{altsInfo});
    }

    /*async showAltsPlus(args, user) {
        if (user.rank < 4) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
            return
        }

        var alts = await this.db.getAltsPlus(args.id)
        if(alts.size == 0) {
            user.send('error', {
                error: 'No accounts have been found.'
            })
        }

        var usernames = Array.from(alts).map(user => user.username)
        user.send('error', {
            error: usernames.join(', ')
        })
    }*/

    async addCoins(args, user) {

        if (user.rank < 6) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
            return
        }

        args.coins = parseInt(args.coins)

        let recipientRaw = (await this.db.getUserById(args.id))
        let userName = recipientRaw.username

        // this.discord.addItemLogs(user.username, userName, args.itemName)

        let recipient = this.usersById[args.id]

        args.item = parseInt(args.item)

        if (recipient) {
            recipient.updateCoins(args.coins, true, null, true, false, user)
            user.send('error', {
                error: 'coins added successfully.'
            })
        }
        else {
            recipientRaw.coins += args.coins
            recipientRaw.save()
            user.send('error', {
                error: 'coins added successfully.'
            })
            if (this?.handler?.elasticsearch) {
                await this.handler.elasticsearch.logCoins(recipientRaw, "gift", args.coins, false, user)
            }
        }

        this.discord.modLog(`**${user.username}** added ${args.coins} to ${userName}`)
    }

    async makePotw(args, user) {

        if (user.rank < 6) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
            return
        }

        let recipientRaw = (await this.db.getUserById(args.id))
        let userName = recipientRaw.username

        await this.addUserItems({id: args.id, item: 11234, itemName: "Green Viking Helmet"}, user)
        await this.addUserItems({id: args.id, item: 9255, itemName: "POTW background"}, user)
        await this.addCoins({id: args.id, coins: 10000}, user)

        if (this?.handler?.elasticsearch) {
            await this.handler.elasticsearch.logMod(user, "potw", args.id, userName)
        }

        this.discord.modLog(`**${user.username}** gave PENGUIN OF THE WEEK awards to ${userName}`)
        user.send('error', {
            error: 'ok theyre potw now.'
        })
    }

    async unban(args, user) {
        if (user.rank < 6) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
            return
        }

        let recipient = await this.db.getUserById(args.id)
        this.discord.modLog(`**${user.username}** UNbanned ${recipient.username}`)

        await this.db.unban(args.id)

        if (this?.handler?.elasticsearch) {
            await this.handler.elasticsearch.logMod(user, "activate_user", args.id, recipient.username)
        }

        user.send('error', {
            error: 'unbanned.'
        })
    }

    async teleportToPlayer(args, user) {
        if (user.rank < 3) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
            return
        }

        if (!(args.id in this.usersById)) {
            return
        }
        let targ = this.usersById[args.id]
        if(!targ.room) return
        this.plugins.join.joinRoom({ room: targ.room.id }, user)
    }

    async unbanIP(args, user) {
        if (user.rank < 6) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
            return
        }

        let recipient = await this.db.getUserById(args.id)
        this.discord.modLog(`**${user.username}** removed IP BAN from ${recipient.username}`)

        await this.db.unbanIP(args.id)

        if (this?.handler?.elasticsearch) {
            await this.handler.elasticsearch.logMod(user, "unban_ip", args.id, recipient.username)
        }

        user.send('error', {
            error: 'unbanned ip.'
        })
    }
    async warnUser(args, user) {
    
        if (user.rank < 3) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
            return
        }
        //here so something is here
    }
    async publishUser(args, user){
        if (user.rank < 6) {
            user.send('error', {
                error: 'You do not have permission to perform this action.'
            })
			return
        }
        if (args.id != NaN){
            let recipient = await this.usersById[args.id]
            let recipientRaw = await this.db.getUserById(args.id)
            if(recipient) {
                recipient.addSystemPostcard(args.mail)
                console.log('was online, so adding normally')
            } else {
                this.db.postcards.create({ senderId: args.id, recipientId: args.id, postcardId: args.mail })
                console.log('was offline, so adding via db')
            }
            user.send('error', {
                error: 'Done'
            })
            this.discord.modLog(`**${user.username}** sent the system postcard of ID ${args.mail} to ${recipientRaw.username}`)
        }
    }

    async sendInfoBox(args, user){

        if (!user.isModerator) {
            return
        }

        let recipient = this.usersById[args.id]
        try {
            if (recipient) {
                recipient.send('info', {message: `${!args.annonymous ? `Message from ${user.username}:\n` : ''}${args.message}`})
            }

            this.discord.modLog(`**${user.username}** sent an info message to ${recipient.username} (${recipient.id})${args.annonymous ? ' annonymously' : ''}. **Message:** ${args.message}`)
        } catch {
            return
        }
        user.send('error',{error:'Done'})
    }

}
