import config from '../config/config.json'
import data from '../data/data'

const allowedRoles = ['1287388970933551125']
const allowedDevs = ['1287388970933551125']

const { EmbedBuilder, PermissionsBitField } = require('discord.js')

export default class DiscordCommands {

    worlds = [] // NOTE: this is misleading; these are the handlers for each world, not the world itself
    handler
    ready = false

    commands = {
        '!rooms': (message) => this.roomsCommand(message, this.args(message)),
        '!room': (message) => this.roomCommand(message, this.args(message)),
        '!users': (message) => this.usersCommand(message, this.args(message)),
        '!igloos': (message) => this.igloosCommand(message, this.args(message)),
        '!reload-crumbs': (message) => this.reloadCrumbsCommand(message),
        '!totalusers': (message) => this.latestUserCommand(message),
        '!meow': (message) => this.meowCommand(message),
        '!broadcast': (message) => this.broadcastCommand(message, this.args(message)),
        '!toggle-maintenance': (message) => this.toggleMaintenanceCommand(message, this.args(message)),
        '!ribbit': (message) => this.ribbitCommand(message),
    }

    constructor(client) {
        this.client = client

        this.client.once('ready', () => this.ready = true)

        this.client.on('messageCreate', async (message) => {
            if(!this.ready) return
            let command = message.content.toLowerCase().split(' ')[0] 
            if (config.discord.isStaging) return
            try {
                if(Object.keys(this.commands).includes(command)) {
                    this.commands[command](message)
                }
            } catch (e) {
                // Why not just have a default here
                console.error(e)
            }
        });
    }

    args(message) {
        return message.content.split(' ').slice(1) || []
    }

    textToTitleCase(str) {
        return str.replace(/\S+/g,
        (txt) => {
            return txt[0].toUpperCase() + txt.substring(1).toLowerCase();
        });
    }

    isAllowed(m) {
        if(allowedRoles.some(r => m.member.roles.cache.has(r)) || m.member.id == '329400132325867530' || m.member.id == '682325420540035154') {
            return true
        }
        return false
    }

    isAllowedDevs(m) {
        if(allowedDevs.some(r => m.member.roles.cache.has(r)) || m.member.id == '329400132325867530' || m.member.id == '682325420540035154' || m.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return true
        }
        return false
    }

    usersCommand(m) {
        if(!this.isAllowed(m)) return

        let string = ''
        let users = 0
        for(let world of this.worlds) {
            if (isNaN(world.population) || world.population == undefined) continue
            string += `${world.id} - ${world.population} users\n`
            users += parseInt(world.population)
        }
        string += `There are ${users} total users online.`
        m.channel.send(string)
    }

    roomCommand(m, args) {
        if(!this.isAllowed(m)) return

        let room = args[0]
        if(!room) {
            return m.channel.send('Please provide a room name')
        }

        let response = ''
        for(let world of this.worlds) {
            let string = ''
            let rooms = Object.values(world.rooms).sort((a,b) => {
                return b.population - a.population
            })
            for(let roomx of rooms) {
                if(roomx.name == room.toLowerCase() || roomx.username?.toLowerCase() == room.toLowerCase()) {
                    string += `${world.id} - Users in ${roomx.name}: ${Object.values(roomx.users).length}`
                } else if(roomx.username) {
                    if(roomx.username.toLowerCase() == room.toLowerCase()) {
                        string += `${world.id} - Users in ${roomx.username}'s igloo: ${Object.values(roomx.users).length}\n`
                    }
                }
            }
            if(string.length < 1) string += `Room was not found in ${world.id}\n`
            response += string
        }
        m.channel.send(response)
    }

    roomsCommand(m, args) {
        if(!this.isAllowed(m)) return

        let world = this.worlds.find(w => w.id.toLowerCase() == args[0]?.toLowerCase())

        if(!world) return m.channel.send('Please specify the name of the server you want the rooms from')

        let rooms = Object.values(world.rooms).sort((a, b) => a.population > b.population)

        let e = ""
        for (let room of rooms) if (room.population > 0 && !room.username) e += `${room.name}: ${room.population}\n`

        const embed = new EmbedBuilder()
        embed.setColor(0x333333)
        embed.setTitle(`Rooms for ${world.id}`)
        embed.setDescription((e == "") ? 'All rooms are empty' : e)

        m.channel.send({ embeds: [embed] })
        //m.channel.send((e == "") ? 'All rooms are empty' : e);
    }

    igloosCommand(m, args) {
        if(!this.isAllowed(m)) return

        let world = this.worlds.find(w => w.id.toLowerCase() == args[0]?.toLowerCase())

        if(!world) return m.channel.send('Please specify the name of the server you want the igloos from')

        let rooms = Object.values(world.rooms).sort((a, b) => a.population > b.population)

        let e = ""
        for (let room of rooms) if (room.population > 0 && room.username) e += `${room.username}'s igloo: ${room.population}\n`

        const embed = new EmbedBuilder()
        embed.setColor(0x333333)
        embed.setTitle(`Igloos for ${world.id}`)
        embed.setDescription((e == "") ? 'All igloos are empty' : e)

        m.channel.send({ embeds: [embed] })
        //m.channel.send((e == "") ? 'All igloos are empty' : e);
    }

    reloadCrumbsCommand(m) {
        if(!this.isAllowedDevs(m)) return

        data.reload()

        for(let world of this.worlds) {
            world.reloadCrumbs()

            for (let user of Object.values(world.users)) {
                user.crumbs = world.crumbs
            }
        }

        m.channel.send('Reloaded crumbs for all servers.');
    }

    async latestUserCommand(m) {
        if(!this.isAllowed(m)) return
        let total = await this.worlds[0].db.getUserTotal()
        m.channel.send(`There are ${total} registered users.`);
    }

    async toggleMaintenanceCommand(m, args) {
        if (!this.isAllowedDevs(m)) return
        let arg = args[0]
        let arg2 = args[1]
        let mode
        if (arg != 'on' && arg != 'off') {
            m.channel.send('you need to provide an argument ON or OFF (like `!toggle-maintenance on`)')
            return
        }
        if (arg == 'on') mode = 1
        if (arg == 'off') mode = 0
        await this.worlds[0].db.setMaintenance(mode)
        /*if (arg2) {
            arg2 = this.textToTitleCase(arg2)
            console.log(arg2)
            await this.worlds[0].db.setMaintenance(mode, arg2)
        } else {
            await this.worlds[0].db.setMaintenance(mode)
        }*/
        m.channel.send(`Maintenance mode set to **${arg}**.`);
    }

    broadcastCommand(m, args) {
        if (!this.isAllowedDevs(m)) return
        if (m.member.id == '950124244132569088') return m.channel.send('no :3')
        let mode = args[0]
        if(!mode || (mode.toLowerCase() != 'dev' && mode.toLowerCase() != 'event')) {
            return m.channel.send('invalid arguments. format must be: !broadcast (mode) (message)\nexample: !broadcast event Pookie gathering at the pet shop')
        }

        mode = mode.toLowerCase()

        let message = args.slice(1).join(' ')
        if(mode == 'dev') {
            mode = 'devalert'
        } else {
            mode = 'eventalert'
        }

        for(let world of this.worlds) {
            for (let user of Object.values(world.users)) {
                user.send('broadcast', {message: message, mode: mode})
            }
            world.discord.modLog(`**${m.author.username}** (${m.member.id}) FROM DISCORD broadcasted a **${mode}**\n> ${message}`)
        }

        const embed = new EmbedBuilder()
        embed.setDescription(message)
        if(mode == 'devalert') {
            embed.setColor(0xFF9300)
            embed.setTitle('Message from the Developers')
        } else {
            embed.setColor(0x3675FF)
            embed.setTitle('Community Event Happening Now!')
        }
        m.channel.send({ content: 'Broadcasted the following to all servers:', embeds: [embed] })
        //m.channel.send('Broadcasted to all servers')
    }

    meowCommand(m) {
        m.channel.send(`https://tenor.com/view/hey-duggee-duggee-enid-cat-miaow-gif-21389759`);
    }

    ribbitCommand(m) {
        m.channel.send(`https://i.imgur.com/whxkeva.png`)
    }
}