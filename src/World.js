import Database from './database/Database'
import GameHandler from './handlers/GameHandler'
import LoginHandler from './handlers/LoginHandler'
import Server from './server/Server'

import config from '../config/config.json'
import Discord from './logging/Discord'
import { Client, GatewayIntentBits } from 'discord.js'
import DiscordCommands from './DiscordCommands'
import RedisConn from './database/RedisConn'
import ElasticSearch from './logging/ElasticSearch'

const discordClient = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
})

discordClient.once('ready', () => {
    console.info(`Logged in as ${discordClient.user.tag}!`)
})

const discordCommands = new DiscordCommands(discordClient)

class World extends Server {

    constructor(id) {
        console.log(`[${id}] Starting world ${id} on port ${config.worlds[id].port}`)

        let users = {}
        let db = new Database(config.database)

        let discord = new Discord(discordClient, config.discord, id)
        let redis = new RedisConn(config)

        let handler = (id == 'Login') ? LoginHandler : GameHandler
        handler = new handler(id, users, db, config, discord, redis)

        super(id, users, db, handler, config, discord, redis)

        if (config?.elasticsearch?.enabled) {
           this.handler.elasticsearch = new ElasticSearch(handler, config)
        }
    }
}

let args = process.argv.slice(2)

for (let world of args) {
    if (world in config.worlds) {
        let _world = new World(world)
        if(!config.discord.isStaging && world != 'Login') discordCommands.worlds.push(_world.handler)
    }
}

if (config.discord.token != '') {
    discordClient.login(config.discord.token)
} else {
    console.log(`No discord token provided, discord logging disabled.`)
}