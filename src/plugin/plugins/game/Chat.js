import GamePlugin from '@plugin/GamePlugin'

import { hasProps, isNumber, isString, isLength, isInRange } from '@utils/validation'
import config from '../../../../config/config.json'

import {getPerspectiveAnalysis} from "../../../chat/filter/Perspective"
import { PerspectiveAPIClientError } from 'perspective-api-client'

import data from '@data/data'

const fetch = require('node-fetch');

class CooldownManager {
    constructor(handler) {
        this.handler = handler;
        this.globalCooldown = 0;
        this.globalCoolText = '';
        this.userNextChatTimes = {};
        this.cooldownIntervals = {
            '15s': 15 * 1000,
            '30s': 30 * 1000,
            '1m': 60 * 1000,
            '2m': 2 * 60 * 1000,
            '5m': 5 * 60 * 1000,
            '10m': 10 * 60 * 1000,
            '15m': 15 * 60 * 1000
        };
    }

    setGlobalCooldown(cooldownTime) {
        this.globalCooldown = this.cooldownIntervals[cooldownTime];
        this.globalCoolText = cooldownTime;
        this.resetAllUserCooldowns();
    }

    clearGlobalCooldown() {
        this.globalCooldown = 0;
        this.globalCoolText = '';
        this.userNextChatTimes = {};
        this.notifyGlobalCooldownCleared();
    }

    resetAllUserCooldowns() {
        const now = Date.now();
        for (let userId in this.userNextChatTimes) {
            this.userNextChatTimes[userId] = now + this.globalCooldown;
        }
    }

    notifyGlobalCooldownCleared() {
        for (let userId in this.handler.usersById) {
            let user = this.handler.usersById[userId];
            if (user) {
                user.send('cooldown_cleared', {});
            }
        }
    }

    isCooldownActive() {
        return this.globalCooldown > 0;
    }

    canUserChat(userId) {
        const now = Date.now();
        const nextChatTime = this.userNextChatTimes[userId] || 0;
        return now >= nextChatTime;
    }

    updateUserNextChatTime(userId) {
        const now = Date.now();
        this.userNextChatTimes[userId] = now + this.globalCooldown;
    }

    getRemainingCooldownTime(userId) {
        const now = Date.now();
        const nextChatTime = this.userNextChatTimes[userId] || 0;
        const remainingTime = nextChatTime - now;
        return Math.max(0, Math.ceil(remainingTime / 1000));
    }

    handleUserLogin(userId) {
        const user = this.handler.usersById[userId];
        if (!user) return;

        if (this.isCooldownActive()) {
            const remainingTime = this.getRemainingCooldownTime(userId);
            if (remainingTime > 0) {
                setTimeout(() => {
                    user?.send("cooldown", { time: remainingTime });
                }, 1000);
            }
        }
    }
}

export default class Chat extends GamePlugin {

    constructor(handler) {
        super(handler)

        this.cooldownManager = new CooldownManager(handler);

        this.events = {
            'send_message': this.sendMessage,
            'send_safe': this.sendSafe,
            'send_stage': this.sendStage,
            'send_emote': this.sendEmote,
            'tell_joke': this.tellJoke,
            'give_tour': this.giveTour,
            'lkhasi_epy': this.setCooldown,
            'lkhasi_repy': this.removeCooldown,
            'server_cooldown_check': this.checkCooldown,
            //'send_key': this.send_key,
        }

        this.commands = {
            'ai': this.addItem,
            'af': this.addFurniture,
            'ac': this.addCoins,
            //'ag': this.addGems,
            'apc': this.addPartyCoins,
            'jr': this.joinRoom,
            'id': this.id,
            'tp': this.teleportTo,
            'tpall': this.teleportAll,
            'as': this.addStamp,
            'users': this.userPopulation,
            'room': this.roomPopulation,
            'rooms': this.globalRoomPopulation,
            'allrooms': this.globalAllRoomPopulation,
            'igloos': this.globalIglooPopulation,
            'reload-crumbs': this.reloadCrumbs,
            'refresh-ipbans': this.refreshIpBans,
            'toggle-maintenance': this.toggleMaintenance,
            'ajc': this.addJitsuCard,
            'aja': this.addAllJitsuCards,
            'air': this.addItemToRoom,
            'ais': this.addItemToServer,
            'tf': this.transform,
            "ri": this.resetIgloo,
            "reload-igloo": this.reloadIgloo,
            "rsc": this.resetStampbookCover,
            'spectate': this.spectate,
            'activetools': this.checkActiveModTools,
            'staffalert': this.staffAlert,
            'apr': this.addPostcardToRoom,
            'cc': this.clearChat,
            'missionstatus': this.updateMissionStatus,
            'clockedin': this.clockedin,
            'invislist': this.invislist,
        }

        this.bindCommands()

        this.modRegex = /[^ -~]/i
        this.userRegex = /[^a-zA-Z!?,'. ]/g
        this.maxMessageLength = 70

        this.commandNames = Object.keys(this.commands)
        // Fast filter
        this.badWords = ["4r5e", "5h1t", "5hit", "a55", "anal", "anus", "ar5e", "arrse", "arse", "ass", "ass-fucker", "asses", "assfucker", "assfukka", "asshole", "assholes", "asswhole", "a_s_s", "b!tch", "b00bs", "b17ch", "b1tch", "ballbag", "balls", "ballsack", "bastard", "beastial", "beastiality", "bellend", "bestial", "bestiality", "bi+ch", "biatch", "bitch", "bitcher", "bitchers", "bitches", "bitchin", "bitching", "bloody", "blow job", "blowjob", "blowjobs", "boiolas", "bollock", "bollok", "boner", "boob", "boobs", "booobs", "boooobs", "booooobs", "booooooobs", "breasts", "buceta", "bugger", "bum", "bunny fucker", "butt", "butthole", "buttmuch", "buttplug", "c0ck", "c0cksucker", "carpet muncher", "cawk", "chink", "cipa", "cl1t", "clit", "clitoris", "clits", "cnut", "cock", "cock-sucker", "cockface", "cockhead", "cockmunch", "cockmuncher", "cocks", "cocksuck", "cocksucked", "cocksucker", "cocksucking", "cocksucks", "cocksuka", "cocksukka", "cok", "cokmuncher", "coksucka", "coon", "cox", "crap", "cum", "cummer", "cumming", "cums", "cumshot", "cunilingus", "cunillingus", "cunnilingus", "cunt", "cuntlick", "cuntlicker", "cuntlicking", "cunts", "cyalis", "cyberfuc", "cyberfuck", "cyberfucked", "cyberfucker", "cyberfuckers", "cyberfucking", "d1ck", "damn", "dick", "dickhead", "dildo", "dildos", "dink", "dinks", "dirsa", "dlck", "dog-fucker", "doggin", "dogging", "donkeyribber", "doosh", "duche", "dyke", "ejaculate", "ejaculated", "ejaculates", "ejaculating", "ejaculatings", "ejaculation", "ejakulate", "f u c k", "f u c k e r", "f4nny", "fag", "fagging", "faggitt", "faggot", "faggs", "fagot", "fagots", "fags", "fanny", "fannyflaps", "fannyfucker", "fanyy", "fatass", "fcuk", "fcuker", "fcuking", "feck", "fecker", "felching", "fellate", "fellatio", "fingerfuck", "fingerfucked", "fingerfucker", "fingerfuckers", "fingerfucking", "fingerfucks", "fistfuck", "fistfucked", "fistfucker", "fistfuckers", "fistfucking", "fistfuckings", "fistfucks", "flange", "fook", "fooker", "fuck", "fucka", "fucked", "fucker", "fuckers", "fuckhead", "fuckheads", "fuckin", "fucking", "fuckings", "fuckingshitmotherfucker", "fuckme", "fucks", "fuckwhit", "fuckwit", "fudge packer", "fudgepacker", "fuk", "fuker", "fukker", "fukkin", "fuks", "fukwhit", "fukwit", "fux", "fux0r", "f_u_c_k", "gangbang", "gangbanged", "gangbangs", "gaylord", "gaysex", "goatse", "God", "god-dam", "god-damned", "goddamn", "goddamned", "hardcoresex", "hell", "heshe", "hoar", "hoare", "hoer", "homo", "hore", "horniest", "horny", "hotsex", "jack-off", "jackoff", "jap", "jerk-off", "jism", "jiz", "jizm", "jizz", "kawk", "knob", "knobead", "knobed", "knobend", "knobhead", "knobjocky", "knobjokey", "kock", "kondum", "kondums", "kum", "kummer", "kumming", "kums", "kunilingus", "l3i+ch", "l3itch", "labia", "lust", "lusting", "m0f0", "m0fo", "m45terbate", "ma5terb8", "ma5terbate", "masochist", "master-bate", "masterb8", "masterbat*", "masterbat3", "masterbate", "masterbation", "masterbations", "masturbate", "mo-fo", "mof0", "mofo", "mothafuck", "mothafucka", "mothafuckas", "mothafuckaz", "mothafucked", "mothafucker", "mothafuckers", "mothafuckin", "mothafucking", "mothafuckings", "mothafucks", "mother fucker", "motherfuck", "motherfucked", "motherfucker", "motherfuckers", "motherfuckin", "motherfucking", "motherfuckings", "motherfuckka", "motherfucks", "muff", "mutha", "muthafecker", "muthafuckker", "muther", "mutherfucker", "n1gga", "n1gger", "nazi", "nigg3r", "nigg4h", "nigga", "niggah", "niggas", "niggaz", "nigger", "niggers", "nob", "nob jokey", "nobhead", "nobjocky", "nobjokey", "numbnuts", "nutsack", "orgasim", "orgasims", "orgasm", "orgasms", "p0rn", "pawn", "pecker", "penis", "penisfucker", "phonesex", "phuck", "phuk", "phuked", "phuking", "phukked", "phukking", "phuks", "phuq", "pigfucker", "pimpis", "piss", "pissed", "pisser", "pissers", "pisses", "pissflaps", "pissin", "pissing", "pissoff", "poop", "porn", "porno", "pornography", "pornos", "prick", "pricks", "pron", "pube", "pusse", "pussi", "pussies", "pussy", "pussys", "rectum", "retard", "rimjaw", "rimming", "s hit", "s.o.b.", "sadist", "schlong", "screwing", "scroat", "scrote", "scrotum", "semen", "sex", "sh!+", "sh!t", "sh1t", "shag", "shagger", "shaggin", "shagging", "shemale", "shi+", "shit", "shitdick", "shite", "shited", "shitey", "shitfuck", "shitfull", "shithead", "shiting", "shitings", "shits", "shitted", "shitter", "shitters", "shitting", "shittings", "shitty", "skank", "slut", "sluts", "smegma", "smut", "snatch", "son-of-a-bitch", "spac", "spunk", "s_h_i_t", "t1tt1e5", "t1tties", "teets", "teez", "testical", "testicle", "tit", "titfuck", "tits", "titt", "tittie5", "tittiefucker", "titties", "tittyfuck", "tittywank", "titwank", "tosser", "turd", "tw4t", "twat", "twathead", "twatty", "twunt", "twunter", "v14gra", "v1gra", "vagina", "viagra", "vulva", "w00se", "wang", "wank", "wanker", "wanky", "whoar", "whore", "willies", "willy", "xrated", "xxx"];
    }

    // Events

    checkCooldown(args, user) {
        if (user && user.rank > 3) {
            user.send('check_cooldown', {time: this.cooldownManager.globalCoolText})
        }
    }

    handleUserLogin(user) {
        this.cooldownManager.handleUserLogin(user.id);
    }

    setCooldown(args, user) {
        if (user.rank < 4 || user.rank > 8) return;

        const { cooldownTime } = args;

        if (!cooldownTime) return;

        this.cooldownManager.setGlobalCooldown(cooldownTime);
        this.discord.modLog(`**${user.username}** has set a global cooldown of ${cooldownTime} in ${this.handler.id}`);
        user.send('info', { message: 'Global cooldown has been set' });
    }

    removeCooldown(args, user) {
        if (user.rank < 4 || user.rank > 8) return;

        this.cooldownManager.clearGlobalCooldown();
        this.discord.modLog(`**${user.username}** has removed the global cooldown in ${this.handler.id}`);
        user.send('info', { message: 'Global cooldown has been removed' });
    }

    // Predictive Text
    async send_key(args, user) {


        if (!hasProps(args, 'text')) {
            return
        }

        if (!isString(args.text)) {
            return
        }

        // split the text into words
        let words = args.text.split(" ")

        // get the last word
        let lastWord = words[words.length - 1]

        if(lastWord.startsWith("!")){
            // predict the command instead with and show the best 6
            let command = lastWord.substring(1)

            let namesOfCommands = [];

            if (user.isModerator) {
                namesOfCommands = this.commandNames;
            }else {
                namesOfCommands = ["room", "users"]
            }

            let best = namesOfCommands.filter(c => c.startsWith(command)).sort((a,b) => a.length > b.length).slice(0, 6)
            // pad the array with empty strings if there are less than 6
            while(best.length < 6){
                best.push("")
            }

            // add the ! back to the start of the command
            best = best.map(b => `!${b}`)

            return await user.send('text_prediction', { words: best.map(b => ({word: b})) })
        }


        const response = await fetch(`https://api.datamuse.com/sug?s=${lastWord}&max=20`)

        const json = await response.json()

        if(config.chat.token != ""){
            let send = []
            for(let i = 0; i < json.length; i++){
                let word = json[i].word
                let bad = false
                for(let j = 0; j < this.badWords.length; j++){
                    if(word.includes(this.badWords[j])){
                        bad = true
                    }
                }
                if(!bad){
                    send.push(json[i])
                }
            }

            return await user.send('text_prediction', { words: send })

        }

        await user.send('text_prediction', { words: json })

    }

    sendChatMessageToMods(user, message, muted, modChat, filtered = false) {
        user.room.send(user, 'send_message', { id: user.id, message: message, muted: muted, modChat: modChat, filtered: filtered}, [user], false, true)
    }

    async logCommand(user, command) {
        this.discord.commandAlert(user, command)

        if (!this?.handler?.elasticsearch) return

        await this.handler.elasticsearch.logCommand(user, command)
    }

    async logChatMessage(user, message, filtered, modChat) {
        if (modChat) {
            this.discord.chatAlert(user, message + " - VIA MOD CHAT", user.room, filtered, user.muted)
        } else {
            this.discord.chatAlert(user, message, user.room, filtered, user.muted)
        }

        if (!this?.handler?.elasticsearch) return

        await this.handler.elasticsearch.logChatMessage(user, message, filtered, modChat)
    }

    async sendMessage(args, user) {
        if (!hasProps(args, 'message')) {
            return;
        }
    
        if (!isString(args.message)) {
            return;
        }
    
        if (user.email_verified !== 1 && user.rank <= 1) {
            return;
        }
    
        let regex = user.isModerator ? this.modRegex : this.userRegex;
    
        if (regex.test(args.message)) {
            await this.logChatMessage(user, args.message, true, false);
            user.send("close_with_error", { error: "You have been kicked.\n Reason: Invalid Character Usage" });
            return await user.close();
        }
    
        user.lessTempEmote = 0;
    
        // Remove extra whitespace
        args.message = args.message.replace(/  +/g, ' ').trim();

        const normalizedMessage = args.message.replace(/\s+/g, '').toLowerCase();

        const prohibitedTerms = ['cpjexposed', 'cpj exposed', 'cpjexposed'];
        for (const term of prohibitedTerms) {
            if (normalizedMessage.includes(term.replace(/\s+/g, ''))) {
                return;
            }
        }

        if (!isLength(args.message, 1, this.maxMessageLength)) {
            return;
        }
    
        if (args.message.startsWith('!')) {
            user.send("filtered", {});
            this.processCommand(args.message, user);
            this.sendChatMessageToMods(user, args.message, user.muted, false);
            await this.logCommand(user, args.message);
            return;
        }
    
        if (args.modChat) {
            if (!user.rank > 1) return;
            this.sendChatMessageToMods(user, args.message, user.muted, true);
            await this.logChatMessage(user, args.message, false, true);
            return;
        }
    
        if (this.handler.safeChat) {
            return user.send("filtered", {});
        }

        if (args.message.toLowerCase() === 'gg' && user && user.finishedGGGame === true) {
            user.send('gg')
            user.updateCoins(25)
            user.finishedGGGame = false;
        }
    
        if (user.muted) {
            this.sendChatMessageToMods(user, args.message, user.muted, false);
            await this.logChatMessage(user, args.message, false, false);
            return;
        }

        if (!this.cooldownManager.canUserChat(user.id)) return;
    
        // Send the message
        if (config.chat.token === "") {
            user.room.send(user, 'send_message', { id: user.id, message: args.message }, [user], true);
        } else {
            try {
                const result = await getPerspectiveAnalysis(args.message);
                let filtered = result.shouldTextBeFiltered();
    
                if (filtered) {
                    if (user.streamer || !user.isModerator) {
                        user.send('error', {
                            error: "Your message was not sent because our chat filter deems it unsuitable for the safe environment of CPJ."
                        });
                    }
                    user.send("filtered", {});
                    this.sendChatMessageToMods(user, args.message, user.muted, false, true);
                } else {
                    user.room.send(user, 'send_message', { id: user.id, message: args.message }, [user], true);
                }
    
                await this.logChatMessage(user, args.message, filtered, false);
            } catch (e) {
                if (e instanceof PerspectiveAPIClientError) console.error(`Perspective API Error: ${e.message}`);
            }
        }
    
        // Apply cooldown immediately after sending the message
        if (!user.isModerator && this.cooldownManager.isCooldownActive()) {
            this.cooldownManager.updateUserNextChatTime(user.id);
            let remainingTime = this.cooldownManager.getRemainingCooldownTime(user.id);
            user.send("cooldown", { time: remainingTime });
        }
    }    
    
    sendSafe(args, user) {
        if (!hasProps(args, 'safe') || !isNumber(args.safe)) {
            return;
        }
    
        if (user.muted) return user.room.send(user, 'send_safe', { id: user.id, safe: args.safe, muted: true }, [user], false, true);
    
        if (args.modChat && user.dataValues.rank > 1) {
            return user.room.send(user, 'send_safe', { id: user.id, safe: args.safe, modChat: true }, [user], false, true);
        }

        if (!this.cooldownManager.canUserChat(user.id)) return;
    
        user.room.send(user, 'send_safe', { id: user.id, safe: args.safe }, [user], true);
    
        if (this.cooldownManager.isCooldownActive()) {
            this.cooldownManager.updateUserNextChatTime(user.id);
            let remainingTime = this.cooldownManager.getRemainingCooldownTime(user.id);
            user.send("cooldown", { time: remainingTime });
        }
    }
    
    sendStage(args, user) {
        if (!hasProps(args, 'message') || !isNumber(args.message)) {
            return;
        }
    
        if (user.muted) return user.room.send(user, 'send_stage', { id: user.id, message: args.message, muted: true }, [user], false, true);
    
        if (args.modChat && user.dataValues.rank > 1) {
            return user.room.send(user, 'send_stage', { id: user.id, message: args.message, modChat: true }, [user], false, true);
        }

        if (!this.cooldownManager.canUserChat(user.id)) return;
    
        user.room.send(user, 'send_stage', { id: user.id, message: args.message }, [user], true);
    
        if (!user.isModerator && this.cooldownManager.isCooldownActive()) {
            this.cooldownManager.updateUserNextChatTime(user.id);
            let remainingTime = this.cooldownManager.getRemainingCooldownTime(user.id);
            user.send("cooldown", { time: remainingTime });
        }
    }
    
    tellJoke(args, user) {
        if (!hasProps(args, 'joke') || !isNumber(args.joke) || !isInRange(args.joke, 1, 15)) {
            return;
        }
    
        if (user.muted) {
            user.room.send(user, 'joke', { id: user.id, joke: args.joke, answer: false, muted: true }, [user], false, true);
            setTimeout(() => {
                user.room.send(user, 'joke', { id: user.id, joke: args.joke, answer: true, muted: true }, [], false, true);
            }, 3000);
            return;
        }

        if (!this.cooldownManager.canUserChat(user.id)) return;
    
        user.room.send(user, 'joke', { id: user.id, joke: args.joke, answer: false }, [user], true);
    
        setTimeout(() => {
            user.room.send(user, 'joke', { id: user.id, joke: args.joke, answer: true }, [], true);
        }, 3000);
    
        if (!user.isModerator && this.cooldownManager.isCooldownActive()) {
            this.cooldownManager.updateUserNextChatTime(user.id);
            let remainingTime = this.cooldownManager.getRemainingCooldownTime(user.id);
            user.send("cooldown", { time: remainingTime });
        }
    }
    
    sendEmote(args, user) {
        if (!hasProps(args, 'emote') || !isNumber(args.emote)) {
            return;
        }
    
        user.tempEmote = user.lessTempEmote = args.emote;
    
        if (user.muted) return user.room.send(user, 'send_emote', { id: user.id, emote: args.emote, muted: true }, [user], false, true);
        if (args.modChat && user.dataValues.rank > 1) return user.room.send(user, 'send_emote', { id: user.id, emote: args.emote, modChat: true }, [user], false, true);

        if (!this.cooldownManager.canUserChat(user.id)) return;
    
        user.room.checkJobEmote(args.emote, user.id, user.x, user.y);
    
        user.room.send(user, 'send_emote', { id: user.id, emote: args.emote }, [user], true);
    
        if (!user.isModerator && this.cooldownManager.isCooldownActive()) {
            this.cooldownManager.updateUserNextChatTime(user.id);
            let remainingTime = this.cooldownManager.getRemainingCooldownTime(user.id);
            user.send("cooldown", { time: remainingTime });
        }
    }
    
    giveTour(args, user) {
        if (user.muted) return user.room.send(user, 'give_tour', { id: user.id, muted: true }, [user], false, true);

        if (!this.cooldownManager.canUserChat(user.id)) return;
    
        user.room.send(user, 'give_tour', { id: user.id, muted: user.muted });
    
        if (!user.isModerator && this.cooldownManager.isCooldownActive()) {
            this.cooldownManager.updateUserNextChatTime(user.id);
            let remainingTime = this.cooldownManager.getRemainingCooldownTime(user.id);
            user.send("cooldown", { time: remainingTime });
        }
    }

    // Commands

    bindCommands() {
        for (let command in this.commands) {
            this.commands[command] = this.commands[command].bind(this)
        }
    }

    processCommand(message, user) {
        message = message.substring(1)

        let args = message.split(' ')
        let command = args.shift().toLowerCase()

        if (command in this.commands) {
            this.commands[command](args, user, `!${message}`)
            return true
        }

        return false
    }

    addItem(args, user, message) {
        if (user.isModerator) {
            this.plugins.item.addItem({ item: args[0] }, user)
        }
    }

    addStamp(args, user, message) {
        if (user.rank >= 6) {
            user.addStamp(args[0])
        }
    }

    async toggleMaintenance(args, user, message) {
        if (user.rank >= 6) {
            if (!args[0] || (args[0].toLowerCase() != 'on' && args[0].toLowerCase() != 'off')) {
                user.send('error',{error:'you need to provide an argument ON or OFF (like `!toggle-maintenance on`)'})
                return
            }
            let mode = args[0] == 'on' ? 1 : 0

            await this.db.setMaintenance(mode, this.handler.id)

            for (let userz of Object.values(this.handler.users)) {
                if(!userz) continue

                if(userz.rank < 2) {
                    userz.send('close_with_error', {error: `Maintenance period is now active. Please try to log in again later.`})
                }
            }

            this.discord.modLog(`**${user.username}** set maintenance mode on ${this.handler.id} to ${args[0].toUpperCase()}.`)
            user.send('info',{message: `Maintenance mode has been set to ${args[0].toUpperCase()}.`})
        }
    }

    addFurniture(args, user, message) {
        if (user.isModerator) {
            this.plugins.igloo.addFurniture({ furniture: args[0], amount: args[1] }, user)
        }
    }

    addCoins(args, user, message) {
        if (user.isModerator) {
            user.updateCoins(args[0], true)
            this.discord.moneyAlert(user, args[0])
        }
    }

    async addGems(args, user, message) {
        const gems = parseInt(args[0]);
        if (user.rank >= 2 && gems !== NaN) {
            await user.updateGems(args[0]);
            user.send('gems_added', { gems: user.gems});
            user.send('error', {
                error: `Added ${args[0]} gems`
            });
        }
    }

    addPartyCoins(args, user, message) {
        if (user.isModerator) {
            if(isNaN(parseInt(args[0]))) return
            let newCoinAmount = parseInt(args[0])
            user.updatePartyCoins(newCoinAmount)
            user.send('add_party_coins', { partyCoins: user.partyCoins })
            user.send('error', {
                error: `Added ${args[0]} party coins`
            });
            //this.discord.moneyAlert(user, args[0])
        }
    }

    joinRoom(args, user, message) {
        if (!user.isModerator) {
            return
        }

        let room = args[0]

        if (!isNaN(parseInt(room))) {
            this.plugins.join.joinRoom({ room: parseInt(room) }, user)
            return
        }

        room = Object.values(this.rooms).find(r => r.name == room.toLowerCase())

        if (room) {
            this.plugins.join.joinRoom({ room: room.id }, user)
        }
    }

    id(args, user, message) {
        user.send('error', { error: `Your ID: ${user.id}` })
    }

    checkActiveModTools(args, user, message) {
        if(user.rank < 2) return
        user.send('error', { error: `
        *** Active Tools ***
        Invisibility: ${user.isInvisible ? 'ENABLED' : 'DISABLED'}
        Streamer Mode: ${user.streamer ? 'ENABLED' : 'DISABLED'}
        Spectating: ${user.currentlySpectating ? this.usersById[user.currentlySpectating] ? this.usersById[user.currentlySpectating].username : '_' : '_'}
        ` })
    }

    teleportTo(args, user, message) {
        if(!user.isModerator) return
        if(!args[0]) return
        let target = args.join(' ')

        for (let userz of Object.values(this.handler.users)) {
            if(!userz) continue

            if(userz.username.toLowerCase() == target.toLowerCase()) {
                return this.plugins.join.joinRoom({ room: userz.room.id }, user)
            } else if(!isNaN(target)) {
                if(userz.id == parseInt(target)) return this.plugins.join.joinRoom({ room: userz.room.id }, user)
            } else if(userz.mascot) {
                if(userz.mascot.name.toLowerCase() == target.toLowerCase()) return this.plugins.join.joinRoom({ room: userz.room.id }, user)
            }
        }
        user.send('error', { error: 'User is not online' })
    }

    spectate(args, user, message) {
        if(!user.isModerator) return
        let target = args.join(' ')

        if(!user.isInvisible) return user.send('error', { error: 'You must be invisible to be able to spectate.' })

        if(target) {
            if(parseInt(target) === 0) {
                if(user.currentlySpectating != null) {
                    let userz = this.usersById[user.currentlySpectating]
                    if(userz) userz.spectators = userz.spectators.filter(id => id != user.id)
                    user.currentlySpectating = null
                }
                user.send('error', { error: `You are now no longer spectating.` })
                return
            }
            for (let userz of Object.values(this.handler.users)) {
                if(!userz) continue

                let userIsMatch = false
                if(userz.username.toLowerCase() == target.toLowerCase()) {
                    userIsMatch = true
                } else if(!isNaN(target)) {
                    if(userz.id == parseInt(target)) {
                        userIsMatch = true
                    }
                }

                if(userIsMatch) {
                    if(userz.spectators.includes(user.id)) {
                        user.send('error', { error: `You are already spectating this user.` })
                        return
                    }
                    if(user.currentlySpectating !== null) {
                        let _user = this.usersById[user.currentlySpectating]
                        if(_user) _user.spectators = _user.spectators.filter(id => id != user.id)
                    }
                    userz.spectators.push(user.id)
                    user.currentlySpectating = userz.id
                    user.send('error', { error: `You are now spectating ${userz.username}. To stop spectating, do !spectate 0` })
                    return
                }
            }
        }
        user.send('error', { error: 'User is not online, or you provided an invalid argument.\n\nFormat is:\nby username: !spectate amman\nby ID: !spectate 100\nto reset: !spectate 0' })
    }

    transform(args, user, message) {
        if(user.rank < 6) return
        if(args[0] == undefined) return

        if(args[0] == 0) return this.plugins['transformations'].revertTransform({}, user, true)
        this.plugins['transformations'].transformPlayer({ transform: parseInt(args[0]) }, user, true)
    }

    userPopulation(args, user, message) {
        if(user.rank > 1){
            user.send('error', { error: `Users online: ${this.handler.population}` })
        }
    }

    roomPopulation(args, user, message) {
        if(user.rank > 1){
            let room = args[0]

            if(!room || user.rank < 2) return user.send('error', { error: `Users in this room: ${Object.values(user.room.users).length}` })

            let rooms = Object.values(this.rooms).sort((a,b) => {
                return b.population - a.population
            })
            for(let roomx of rooms) {
                if(roomx.name == room.toLowerCase() || roomx.username?.toLowerCase() == room.toLowerCase()) {
                    if(roomx.username) {
                        return user.send('error', { error: `Users in ${roomx.username}'s igloo: ${Object.values(roomx.users).length}` })
                    }
                    return user.send('error', { error: `Users in ${roomx.name}: ${Object.values(roomx.users).length}` })
                }
            }

            user.send('error', { error: 'Room not found' })
        }
    }

    globalRoomPopulation(args, user, message) {
        if(user.rank < 4){
            return
        }

        let rooms = Object.values(this.rooms).sort((a,b) => {
            return b.population - a.population
        })

        let e = ""
        for(let room of rooms) if(room.population > 0 && !room.username) e += `${room.username ? `${room.username}'s igloo` : room.name}: ${room.population}; `

        user.send('error', { error: e})
    }

    globalAllRoomPopulation(args, user, message) {
        if(user.rank < 4){
            return
        }

        let rooms = Object.values(this.rooms).sort((a,b) => {
            return b.allPopulation - a.allPopulation
        })

        let e = ""
        for(let room of rooms) if(room.allPopulation > 0 && !room.username) e += `${room.username ? `${room.username}'s igloo` : room.name}: ${room.allPopulation}; `

        user.send('error', { error: e})
    }

    globalIglooPopulation(args, user, message) {
        if(user.rank < 4){
            return
        }

        let rooms = Object.values(this.rooms).sort((a,b) => {
            return b.population - a.population
        })

        let e = ""
        for(let room of rooms) if(room.population > 0 && room.username) e += `${room.username ? `${room.username}'s igloo` : room.name}: ${room.population}; `

        user.send('error', { error: e})
    }

    reloadCrumbs(args, user, message) {

        if(user.rank < 5){
            return
        }

        data.reload()

        this.handler.reloadCrumbs()

        for (let userz of Object.values(this.handler.users)) {
            userz.crumbs = this.handler.crumbs
        }

        user.send('error', { error: `Crumbs reloaded.` })

    }

    async refreshIpBans(args, user, message) {

        if(user.rank < 4){
            return
        }

        let users = await this.db.getIpBannedUsers()
        for(let bannee of users) {
            await this.db.ipBan(bannee.id)
        }

    }

    staffAlert(args, user, message) {
        if (user.rank < 4) return

        for (let userz of Object.values(this.handler.users)) {
            if(userz.rank > 1) userz.send('info', { message: `Staff alert from ${user.username}:\n\n${args.join(' ')}` })
        }
    }

    async addJitsuCard(args, user, message) {
        if (user.rank != 8) return

        let card = args[0]

        this.addCards(user, card)

        user.send('info' , {message: "Card added"})
    }

    async addCards(user, cardID) {
        if (isNaN(cardID)) {
            user.send('error' , {error: "Invalid card ID"})
        }

        await this.handler.db['cards'].create({userId: user.id, cardId: cardID})
    }

    async addAllJitsuCards(args, user, message) {
        if (user.rank != 8) return

        let cardCrumbs = this.handler.crumbs.cards;

        let cards = await this.handler.db['cards'].findAll({where: {userId: user.id}})

        for (let cardCrumb of Object.keys(cardCrumbs)) {
            if (!cards.find(c => c.cardId == cardCrumb)) {
                await this.handler.db['cards'].create({userId: user.id, cardId: cardCrumb})
            }
        }

        user.send('info' , {message: "All cards added"})

    }

    addItemToRoom(args, user) {
        if (user.rank == 8) {
            const item = parseInt(args[0]);
            if (isNaN(item)) {
                user.send("error", {error: "Item ID must be a number!"});
                return;
            }

            for (let player in user.room.users) {
                if (!user.room.users[player]) continue;
                if (!user.room.users[player].inventory.includes(item)) {
                    this.plugins.item.addItem({item: item}, user.room.users[player]);
                }
            }
        }
    }

    addItemToServer(args, user) {
        if (user.rank == 8) {
            const item = parseInt(args[0]);
            if (isNaN(item)) {
                user.send("error", {error: "Item ID must be a number!"});
                return;
            }

            for (let player in this.usersById) {
                if (!this.usersById[player]) continue;
                if (!this.usersById[player].inventory.includes(item)) {
                    this.plugins.item.addItem({item: item}, this.usersById[player]);
                }
            }
        }
    }

    async resetIgloo(args, user){
        if(!user.isModerator) return
        const player = await this.db.getUserByUsername(args[0]);
        if(!player) return

        const igloo = this.plugins.igloo.getIgloo(player.id)
        if(!igloo) return

        await igloo.clearFurniture()
        await igloo.update({ type: 1, flooring: 0, music: 0, location: 1, locked: 1, boundaries: 0 })
        igloo.type = igloo.location = igloo.locked = 1
        igloo.flooring = igloo.music = igloo.boundaries = 0
        await igloo.refresh()
    }

    async reloadIgloo(args, user){
        if(!user.isModerator) return
        if(args.length <= 0) return user.send("error", {error: "!reload-igloo <username> [slotID]"})
        const player = await this.db.getUserByUsername(args[0]);
        if(!player) return
        const igloo = this.plugins.igloo.getIgloo(player.id)
        if(!igloo) return

        let slot = igloo.slot
        if(args.length > 1) slot = parseInt(args[1])

        if (this.handler.redisPub) {
            this.handler.redisPub.publish(
                "igloo-refresh",
                JSON.stringify({origin: `${this.handler.id} BUT FROM COMMAND`, userId: player.id, slot: slot, reason: "Reload Igloo Command"})
            );
        }

        player.igloo_slot = slot
        player.update({igloo_slot: player.igloo_slot})
    }

    async resetStampbookCover(args, user){
        if(!user.isModerator) return
        const player = await this.db.getUserByUsername(args[0]);
        if(!player) return

        await this.db.stampbookStamps.destroy({ where: { userId: player.id } })

        this.discord.modLog(`**${user.username}** reset ${player.username}'s stampbook cover.`)
    }

    /**
     * Adds a postcard to the room.
     *
     * @param {Array} args - The arguments passed to the method.
     * @param {Object} user - The user object
     */
    async addPostcardToRoom(args, user) {
        if (user.rank == 8) {
            const postcard = parseInt(args[0]);
            if (isNaN(postcard)) {
                user.send("error", {error: "Postcard ID must be a number!"});
                return;
            }

            for (let player in user.room.users) {
                if (!user.room.users[player]) continue;
                this.plugins.postcards.sendPostcard({cardId: postcard, userId: user.room.users[player].id}, user, true);
            }
        }
    }

    async clearChat(args, user) {
        if (user.rank < 4) return;

        for (let userz of user.room.allUserValues) {
            if (userz.rank < 4) {
                userz.send("clear_chat", {});
            } else if (userz.rank >= 4 && userz.room === user.room) {
                if (userz.rank > 4) {
                    userz.send('info', { message: `Chat cleared by ${user.username}` });
                }
            }
        }
        
        this.discord.modLog(`**${user.username}** has cleared chat in ${user.room.name}`);
    }

    updateMissionStatus(args, user) {
        if(!user.isModerator) return
        if(args[0] == undefined) return
        args[0] = parseInt(args[0])
		if(isNaN(args[0])) return
		if(args[0] < 0) return
		if(args[0] > 8) return

		user.update({ pirate_status: args[0] })
        user.send('error', { error: 'done, please relog for it to take effect' })
    }

    clockedin(args, user, message) {
        if (user.rank < 2) return;

        const clockedInUsers = Object.values(this.handler.users)
            .filter(u => u.rank > 2)
            .map(u => ({
                username: u.username,
                room: u.room ? u.room.name : 'No room'
            }))
            .sort((a, b) => a.username.localeCompare(b.username));

        if (clockedInUsers.length === 0) {
            user.send('error', { error: 'No Staff is currently clocked in.' });
        } else {
            // Format the message to include room information
            const popupMessage = clockedInUsers.length > 0
                ? `Staff Members Clocked In:\n${clockedInUsers.map(u => `${u.username} (${u.room})`).join(', ')}`
                : 'No staff members are currently clocked in.';

            user.send('info', { message: popupMessage });
        }
    }

    teleportAll(args, user) {
        if (user.rank < 6) return;

        const currentRoom = user.room.id;

        for (let otherUser of Object.values(this.handler.users)) {
            if (!otherUser || otherUser.id === user.id) continue;

            this.plugins.leave.leaveRoom({ room: otherUser.room.id }, otherUser);

            this.plugins.join.joinRoom({ room: currentRoom }, otherUser);

            otherUser.send('info', { message: `You have been teleported to room ${currentRoom} by ${user.username}.` });
        }

        user.send('info', { message: 'All players have been teleported to your current room.' });
    }

    invislist(args, user) {
        if (user.rank < 4) return;

        let invisibleUsers = Object.values(this.handler.users)
            .filter(u => u.isInvisible)
            .map(u => `${u.username} (${u.room ? u.room.name : 'No room'})`);

        if (invisibleUsers.length > 0) {
            user.send('info', { message: `Invisible Users\n${invisibleUsers.join(', ')}` });
        } else {
            user.send('error', { error: 'No users are currently invisible.' });
        }
    }

}
