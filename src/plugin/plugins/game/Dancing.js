import GamePlugin from '@plugin/GamePlugin'


export default class Dancing extends GamePlugin {

    /*
    *   Controls the Dance Contest multiplayer functionality. To my understanding,
    *   it's basically one giant queue that's constantly active, so using stuff
    *   like tables or game instances wouldn't have been ideal. Therefore, this
    *   seems to be the best solution.
    */

    constructor(handler) {
        super(handler)

        this.events = {
            'dancing_get_game': this.getGame,
            'dancing_change_difficulty': this.changeDifficulty,
            'dancing_send_move': this.sendMove,
            'dancing_leave_game': this.leaveGame,
        }

        this.queue = {}
        this.dancers = {}

        this.Easy = 0
        this.Medium = 1
        this.Difficult = 2
        this.Expert = 3

        this.capacity = 15

        this.roomId = 952

        this.trackIndex = 0
        this.queuedTrack = this.tracks[this.trackIndex]
        this.currentTrack = null

        this.nextSongTimestamp = 0

        this.initTimeout()
    }

    getGame(args, user) {
        if(user.room.id !== this.roomId) return
        this.addPenguin(user)
    }

    leaveGame(args, user) {
        this.removePenguin(user)
    }

    changeDifficulty(args, user) {
        if(!args || args.difficulty == undefined) return
        if(isNaN(args.difficulty)) return
        if(parseInt(args.difficulty) < 0 || parseInt(args.difficulty) > 3) return

        this.setDifficulty(user, parseInt(args.difficulty))
    }

    sendMove(args, user) {
        //if(!args || args.score == undefined) return
        //if(isNaN(args.score)) return

        this.setScore(user, args.score)

        this.sendToRoom('dancing_player_action', { data: this.getString() })
    }

    initTimeout() {
        this.nextRound()
        setTimeout(() => this.initTimeout(), this.currentTrack.song_length_millis)
    }

    sendToRoom(packet, args) {
        for(let dancer of Object.values(this.dancers)) {
            dancer.penguin.send(packet, args)
        }
    }

    get tracks() {
        return [
            {
                id: 0,
                name: "Penguin Band Boogie",
                song_length_millis: 123000,
                song_length: 241,
                millis_per_bar: 2000
            },
            {
                id: 1,
                name: "The Generic Way",
                song_length_millis: 117000,
                song_length: 221,
                millis_per_bar: 2070
            },
            {
                id: 2,
                name: "Epic Win",
                song_length_millis: 124000,
                song_length: 176,
                millis_per_bar: 2666
            },
            {
                id: 3,
                name: "Let's Bounce",
                song_length_millis: 130000,
                song_length: 288,
                millis_per_bar: 1714
            },
            {
                id: 4,
                name: "Go West",
                song_length_millis: 139000,
                song_length: 248,
                millis_per_bar: 2181
            },
            {
                id: 5,
                name: "Patrick's Jig",
                song_length_millis: 118000,
                song_length: 168,
                millis_per_bar: 2790
            }
        ]
    }

    async addPenguin(user) {
        if(!Object.keys(this.queue).includes(user.id) && !Object.keys(this.dancers).includes(user.id)) {
            if(Object.values(this.queue).length < this.capacity) {
                let dancer = {
                    penguin: user,
                    score: 0,
                    difficulty: 0
                }
                this.queue[user.id] = dancer
                user.onDanceFloor = true
                await user.send('dancing_get_game', { data: [ 0, this.queuedTrack.id, this.getTimeToNextSong() ] })
                await user.send('dancing_join_game', { data: [ 'true', this.queuedTrack.id, this.getTimeToNextSong() ] })
            } else {
                await user.send('dancing_join_game', { data: [ 'false' ] })
            }
        }
    }

    removePenguin(user) {
        if(Object.keys(this.queue).includes(user.id)) delete this.queue[user.id]
        if(Object.keys(this.dancers).includes(user.id)) {
            delete this.dancers[user.id]
            this.sendToRoom('dancing_player_action', { data: this.getString() })
        }

        user.onDanceFloor = false
    }

    nextRound() {
        this.currentTrack = this.queuedTrack

        this.dancers = this.queue
        this.queue = {}

        let songData = {}
        for(let difficulty of [this.Easy, this.Medium, this.Difficult, this.Expert]) {
            songData[difficulty] = this.getSongData(this.currentTrack.song_length, this.currentTrack.millis_per_bar, difficulty)
        }

        for(let dancer of Object.values(this.dancers)) {
            let [noteTypes, noteTimes, noteLengths] = songData[dancer.difficulty]
            dancer.penguin.send('dancing_start_game', { data: [
                noteTimes.map(String).join(','),
                noteTypes.map(String).join(','),
                noteLengths.map(String).join(','),
                this.currentTrack.millis_per_bar
            ] })
        }

        this.sendToRoom('dancing_player_action', { data: this.getString() })

        this.trackIndex++
        if(this.trackIndex > this.tracks.length - 1) this.trackIndex = 0
        this.queuedTrack = this.tracks[this.trackIndex]

        this.nextSongTimestamp = parseInt(Math.floor(Date.now() + this.currentTrack.song_length_millis))
    }

    setScore(user, score) {
        if(!Object.keys(this.dancers).includes(`${user.id}`)) return
        this.dancers[user.id].score = Math.max(this.dancers[user.id].score, score)
    }

    setDifficulty(user, difficulty) {
        if(!Object.keys(this.queue).includes(user.id)) return
        this.queue[user.id].difficulty = Math.min(this.Expert, Math.max(0, difficulty))
    }

    getString() {
        let _toString = []
        for(let dancer of Object.values(this.dancers)) {
            _toString.push(`-1|${dancer.penguin.displayName}|${dancer.score}`)
        }
        _toString = _toString.join(',')
        return _toString
    }

    getTimeToNextSong() {
        return this.nextSongTimestamp - parseInt(Math.floor(Date.now()))
    }

    getSongData(songLength, msPerBar, difficulty) {
        let msPerBeat = Math.floor(msPerBar / 4)

        let noteTypes = []
        let noteTimes = []
        let noteLengths = []
        let lastNoteTimes = [0,0,0,0]

        function getRandomInt(min, max) {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min)) + min;
        }

        function addNote(beatTime, maxLength) {
            let noteType = Math.floor(Math.random() * 4)
            let noteTime = parseInt(beatTime * msPerBeat)
            let noteLength = parseInt(getRandomInt(0, maxLength) * msPerBeat)

            if(noteTime > lastNoteTimes[noteType]) {
                noteTypes.push(noteType)
                noteTimes.push(noteTime)
                noteLengths.push(noteLength)
            }
        }

        for(let songTime = 4; songTime < songLength; songTime++) {
            if(!songTime / 8 && difficulty >= this.Easy) {
                addNote(songTime, 4)
                if(Math.floor(Math.random() * 4) == 0) addNote(songTime, 0)
            }
            else if(!songTime / 4 && difficulty >= this.Medium) {
                addNote(songTime, 4)
                if(Math.floor(Math.random() * 2) == 0) addNote(songTime, 0)    
            }
            else if(!songTime / 2 && difficulty >= this.Difficult) {
                addNote(songTime, 2)    
            }
            else if(Math.floor(Math.random() * 4) > 0 && difficulty >= this.Expert) {
                addNote(songTime, 0)  
                if(Math.floor(Math.random() * 4) == 0) addNote(songTime + 0.5, 0)  
            }
        }

        return [noteTypes, noteTimes, noteLengths]

    }

}
