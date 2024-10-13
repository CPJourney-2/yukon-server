import GamePlugin from '@plugin/GamePlugin'

const amazementRooms = [856, 857, 858, 859, 860]

export default class Party extends GamePlugin {

	constructor(handler) {
		super(handler)

		this.events = {
			'get_parties': this.getParties,
			'get_party_quests': this.getPartyQuests,
			'quest_complete': this.questComplete,
			'add_party_coins': this.addPartyCoins,

			//'get_concerts': this.getConcerts,
			//'get_current_concert': this.getCurrentConcert
			//'update_mission_checkpoint': this.updateMissionCheckpoint,
			//'replay_operation': this.replayOperation
			'rdespcsqd': this.rideSpaceSquid
		}

		this.gemPayouts = {
			'easy': 10,
			'medium': 20,
			'hard': 30,
			'extreme': 50
		}

		this.party = null;

		if (this.handler.crumbs.parties && !this.party) {
			for (const [id, party] of Object.entries(this.handler.crumbs.parties)) {
				if (party.current) {
					this.party = parseInt(id);
					break;
				}
			}
		}

		// 1 = Dock
		// 2 = Coffee
		// 3 = Iceberg
		// 4 = Night Club
		this.concerts = {
			1: {
				room: 800,
				duration: 486000
			},
			2: {
				room: 110,
				duration: 621000
			},
			3: {
				room: 805,
				duration: 553000
			},
			4: {
				room: 120,
				duration: 748000
			}
		}

		this.activeConcert = null

		this.playersReminded = false

		//this.nextConcert = this.findNextConcert() 
		/*this.nextConcert = {
			id: 4,
			room: this.concerts[4].room,
			time: 1721620800 * 1000,
			now: Date.now()
		}*/
		//setInterval(() => this.checkConcerts(),1000)
	}

	getParties(args, user) {
		const parties = this.handler.crumbs.parties;
		
		if (parties && Object.keys(parties).length > 0) {
			const scrubbedParties = Object.entries(parties).reduce((acc, [partyId, partyDetails]) => {
				if(!partyDetails.no_quests) {
					const { prize, ...detailsWithoutPrize } = partyDetails;
					acc[partyId] = detailsWithoutPrize;
				}
				return acc;
			}, {});
	
			user.send('get_parties', {parties: scrubbedParties});
		} else {
			user.send('get_parties', {parties: {}});
		}
	}

	async getPartyQuests(args, user) {
		if (!args.partyId || typeof args.partyId !== 'number') return;
	
		const partyQuests = this.handler.crumbs.party_quests;
		let questsForParty = [];
	
		const completedQuests = await this.db.userQuests.findAll({
			where: { userId: user.id, partyId: args.partyId },
			attributes: ['questId'],
			raw: true
		});
		const completedQuestIds = completedQuests.map(quest => quest.questId);
	
		const prize = this.handler.crumbs.parties[args.partyId].prize.id
		const prizeType = this.handler.crumbs.parties[args.partyId].prize.type
	
		if (partyQuests && Object.keys(partyQuests).length > 0) {
			for (const questId in partyQuests) {
				const quest = partyQuests[questId];
				if (quest.partyId === args.partyId) {
					questsForParty.push({
						...quest,
						completed: completedQuestIds.includes(parseInt(questId)),
						prize: prize,
						prizeType: prizeType
					});
				}
			}
			user.send('get_party_quests', {partyQuests: questsForParty});
		} else {
			user.send('get_party_quests', {partyQuests: []});
		}
	}

	async questComplete(args, user) {
		if (!args || !args.questId || typeof args.questId !== "number" || !this.party) return;
        let questsCompleted = await this.db.getUserPartyQuests(user.id);
        if (questsCompleted.includes(args.questId)) return;
        let partyQuests = this.handler.crumbs.party_quests[args.questId]
        if (!partyQuests || partyQuests.length == 0) return;
		if (!this.party) return;
        await this.db.userQuests.create({
			questId: args.questId,
            partyId: this.party,
			userId: user.id,
        });
        await user.updateGems(this.gemPayouts[partyQuests.difficulty], true);
        user.send("quest_complete", {
			gems: user.gems,
            gems_earned: this.gemPayouts[partyQuests.difficulty],
            difficulty: partyQuests.difficulty,
			quest: args.questId,
        });

		if (this?.handler?.elasticsearch) {
			let partyName = this.handler.crumbs.parties[this.party].name
			let quest = this.handler.crumbs.party_quests[args.questId]
			await this.handler.elasticsearch.logQuest(user, args.questId, quest.description, quest.difficulty, quest.community, this.party, partyName)
		}
		// await this.checkPartyCompletion(user, args.questId);
	}

	async checkPartyCompletion(user, completedQuest) {
		if (!this.party || !user) return;
	
		let activePartyQuests = Object.entries(this.handler.crumbs.party_quests)
        .filter(([questId, questDetails]) => questDetails.partyId === this.party)
        .map(([questId, _]) => parseInt(questId));

		if (activePartyQuests.length === 0) return;
	
		// Fetch the user's completed quests for the current party
		let questsCompleted = await this.db.getUserSpecificPartyQuests(user.id, this.party);
		if (!questsCompleted) return;

		if (!questsCompleted.includes(completedQuest)) {
			questsCompleted.push(completedQuest);
		}
	
		// Check if all active party quests are completed by the user
		const allQuestsCompleted = activePartyQuests.every(questId => questsCompleted.includes(questId));
	
		if (allQuestsCompleted) {
			let prizeInfo = this.handler.crumbs.parties[this.party].prize
			//the prize id is just a number so default to clothing
			if(!isNaN(prizeInfo)) return this.plugins.item.addPrize({ item: prizeInfo }, user)

			this.plugins.item.addPrize({ item: prizeInfo.id, type: prizeInfo.type }, user)
		}
	}

	stampValid(stamp) {
		if (this.handler.crumbs.parties) {
			for (const [id, party] of Object.entries(this.handler.crumbs.parties)) {
				if (party.current && party.stamps) {
					if(party.stamps.includes(stamp)) {
						return true
					}
				}
			}
			return false
		}
		return false
	}

	addPartyCoins(args, user) {
		if (!user.room?.game && !amazementRooms.includes(user.room?.id)) return
		if (amazementRooms.includes(user.room?.id) && args.partyCoins > 20) return
		user.updatePartyCoins(args.partyCoins)
		user.send('add_party_coins', { partyCoins: user.partyCoins })
		this.discord.moneyAlert(user, args.partyCoins, user.room.name, true)
	}

	/**************************************************************
	 * EVERYTHING RELATED TO INDIVIDUAL PARTIES SHOULD BE BELOW HERE
	 **************************************************************/


	rideSpaceSquid(args, user) {
		if (user.room.id !== 861) return

		user.room.send(user, 'rdespcsqd', { id: user.id }, [])
	}







	updateMissionCheckpoint(args, user) {
		if(!args.checkpoint) return
		if(typeof args.checkpoint !== 'number') return
		if(isNaN(args.checkpoint)) return
		if(args.checkpoint < 1) return
		if(args.checkpoint > 8) return

		if(user.replayingOperation) {
			if(args.checkpoint == 8) {
				user.replayingOperation = false
				user.missionReplayStatus = 0
				return
			}
			user.missionReplayStatus = args.checkpoint
			return
		}

		user.update({ pirate_status: args.checkpoint })
	}

	replayOperation(args, user) {
		if(user.pirate_status < 8) return

		if(!user.replayingOperation) {
			user.replayingOperation = true
			user.lastRoomBeforeMission = user.room.id
			this.plugins.join.joinRoom({ room: 803 }, user)
		} else {
			user.replayingOperation = false
			this.plugins.join.joinRoom({ room: user.lastRoomBeforeMission || 1 }, user)
		}
	}





    get MidnightFirstDay() {
        // get timestamp from https://r.3v.fi/discord-timestamps/, do NOT remove the multiplication by 1000
        // on prod, timestamp should be 12:00 AM PST on July 19
        return 1721372400 * 1000
    }

    get _4Hours() {
		// uncomment this for the normal 4 hour wait period
        //return 14400 * 1000
		return 10800 * 1000

		// for testing, change 300 to the amount of seconds you want to wait between each concert
		//return 120 * 1000
		//return 1800 * 1000
    }

    get _1Day() {
        return 86400 * 1000
    }

	checkConcerts() {
		const now = Date.now()
		const TwoMinutes = 120000
		if(this.activeConcert) {
			if(now > (this.activeConcert.time + this.concerts[this.activeConcert.id].duration)) {
				this.activeConcert = null
				this.playersReminded = false
				for(let user of Object.values(this.handler.users)) {
					user.send('end_concert', {})
				}
			}
		}
		if(now > (this.nextConcert.time - TwoMinutes) && !this.playersReminded) {
			for(let user of Object.values(this.handler.users)) {
                user.send('concert_reminder', { id: this.nextConcert.id })
            }
			this.playersReminded = true
		}
		if(this.nextConcert.time < now) {
			for(let user of Object.values(this.handler.users)) {
                user.send('begin_concert', { id: this.nextConcert.id })
            }
			this.activeConcert = this.nextConcert
			this.nextConcert = this.findNextConcert()
		}
	}

    findNextConcert() {
		const ConcertRotation = [1,2,3,4]
        let index = 0
        let timestamp = this.MidnightFirstDay
        let hoursIn = 0
        const now = Date.now()

        function add1ToIndex() {
            index++
            if(index > ConcertRotation.length - 1) index = 0
        }

        while(true) {
            timestamp += this._4Hours
            hoursIn += this._4Hours
            add1ToIndex()
            // bump index by 1 again if we've reached a full day
            if(hoursIn > this._1Day) {
                add1ToIndex()
                hoursIn = this._4Hours
            }

            if(timestamp >= now) {
                const obj = {
                    id: ConcertRotation[index],
					room: this.concerts[ConcertRotation[index]].room,
                    time: timestamp,
                    now: now
                }
                return obj
            }
        }
    }
    
    getConcerts(_, user) {
		let obj
		if(this.activeConcert) {
			obj = {...this.activeConcert,happeningNow:true}
		} else {
			obj = this.nextConcert
		}
        user.send('get_concerts', obj)
    }

	getCurrentConcert(_, user) {
		const obj = {}
		if(this.activeConcert) {
			obj.id = this.activeConcert.id
			obj.timeRemaining = Date.now() - this.activeConcert.time
			//obj.timeRemaining = (this.activeConcert.time + this.concerts[this.activeConcert.id].duration) - Date.now()
		} else {
			obj.id = 0
		}
		user.send('get_current_concert', obj)
	}



	towerCheckpoint(args, user) {
		if (args.floor && typeof args.floor === 'number') {
			if (args.floor > user.highest_floor_reached) {
            	// Only award skill points for every 5 floors
				if (args.floor % 5 === 0 && args.floor <= 340) {
					// Calculate the maximum possible skill points based on the new highest floor reached
					const maxSkillPoints = Math.floor(args.floor / 5)

					// Calculate current maximum skill points based on the previous highest floor reached
					const currentMaxSkillPoints = Math.floor(user.highest_floor_reached / 5)

					// Calculate the skill points to add
					const skillPointsToAdd = maxSkillPoints - currentMaxSkillPoints

					// Check if the skill points to add are more than 2, return early if true bc cheating
					if (skillPointsToAdd > 2) {
						return
					}

					// Add the calculated skill points to the user's current skill points
					user.inf_skill_points += skillPointsToAdd

					// Update user's skill points
					user.update({ inf_skill_points: user.inf_skill_points })
					user.send('update_skill_points', { skillPoints: user.inf_skill_points })
				}
	
				// Update the highest floor reached
				user.highest_floor_reached = args.floor
				user.update({ highest_floor_reached: user.highest_floor_reached })
				user.send('update_highest_floor', { highestFloor: user.highest_floor_reached })
			}
		}
	}
}
