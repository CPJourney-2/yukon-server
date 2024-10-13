import GamePlugin from '@plugin/GamePlugin'


export default class PlayerSubmissions extends GamePlugin {

    constructor(handler) {
        super(handler)

        this.events = {
            'newspaper_submission': this.newspaperSubmission,
            'art_submission': this.artSubmission,
            'report_player': this.reportPlayer,
            'community_event': this.communityEvent,
            'suggestion_box': this.suggestionBox
        }

    }

    newspaperSubmission(args, user) {
        if(!args) return
        this.discord.auntArcticAlert(user, args.message, args.mode)
    }

    artSubmission(args, user) {
        if(!args) return
        this.discord.artSubmission(user, args.img, args.painting)
    }

    async reportPlayer(args, user) {
        if(!args) return
    	const username = (await this.db.getUserById(args.userId)).username
        let room;
        if (!user.room.name && user.room.username) {
            room = `${user.room.username}'s Igloo`
        } else if (user.room.name) {
            room = user.room.name
        }
        this.discord.report(user, args.message, args.cat1, args.cat2, username, room)
        this.db.reports.create({reportedId: args.userId, reportedById: user.id, room: room, reason: `${args.cat1} - ${args.cat2}`, message: args.message})
    }

    async communityEvent(args, user) {
        if(!args) return
        this.discord.communityEvent(user, args.eventName, args.eventDescription, args.eventWhere, args.eventTime)
    }
    suggestionBox(args, user) {
        if(!args) return
        this.discord.suggestionBoxAlert(user, args.message)
    }

}
