import BaseTable from './BaseTable'

import { isNumber } from '@utils/validation'


export default class TreasureHuntTable extends BaseTable {
    init() {
        super.init();

        this.mapWidth = 10;
        this.mapHeight = 10;
        this.treasureLocations = [];
        this.map = [];
        this.rowsCleared = [0,0,0,0,0,0,0,0,0,0];
        this.columnsCleared = [0,0,0,0,0,0,0,0,0,0];
        this.player1Lives = 6;
        this.player2Lives = 6;
        this.moves = 12;
        this.emerald = 0;
        this.coinsHidden = 0;
        this.gemsHidden = 0;
        this.coinsDiscovered = 0;
        this.gemsDiscovered = 0;
        this.emeraldDiscovered = 0;
        this.emeraldValue = 100;
        this.gemValue = 25;
        this.coinValue = 1;

        this.GEM_SKILLS_STAMP = 414
        this.COLLECTOR_STAMP = 416
        this.IN_THE_ROUGH_STAMP = 418
        this.GEM_EXPERT_STAMP = 420
        this.GEM_PRO_STAMP = 422
        
        this.initializeMap();
    }

    initializeMap() {
        for (let row = 0; row < this.mapHeight; row++) {
            this.map.push([]);
            for (let column = 0; column < this.mapWidth; column++) {
                const treasureType = this.generateTreasure(row, column);
                this.map[row].push([treasureType, 0]);
                if (treasureType === 1) {
                    this.coinsHidden++;
                } else if (treasureType === 2) {
                    this.gemsHidden++;
                } else if (treasureType === 4) {
                    this.emerald = 1;
                }
            }
        }
    }
    
    generateTreasure(row, column) {
        let treasureTypes = [['None', 0], ['Coin', 1], ['Gem', 2]];
        let weights = [80, 20, 1];
    
        // Add Emerald only if it hasn't been added yet
        if (!this.emerald) {
            treasureTypes.push(['Emerald', 4]);
            weights.push(0.5);
        }
    
        // Adjust for edges of the map
        if (row + 1 === this.mapHeight || column + 1 === this.mapWidth) {
            treasureTypes = treasureTypes.slice(0, 2);
            weights = [80, 20];
        }
    
        if (this.getGemByPiece(row, column)) {
            return 3;
        }
    
        const treasureTypeIndex = this.randomChoice(treasureTypes, weights);
        return treasureTypes[treasureTypeIndex][1];
    }

    getGemByPiece(row, column) {
        if (row > 0) {
            let [treasure, digs] = this.map[row - 1][column];
            if (treasure === 2 || treasure === 4) {
                return [row - 1, column];
            }
        }
        if (column > 0) {
            let [treasure, digs] = this.map[row][column - 1];
            if (treasure === 2 || treasure === 4) {
                return [row, column - 1];
            }
        }
        if (row > 0 && column > 0) {
            let [treasure, digs] = this.map[row - 1][column - 1];
            if (treasure === 2 || treasure === 4) {
                return [row - 1, column - 1];
            }
        }
        return null;
    }

    isGemUncovered(row, column) {
        // Prevent checking beyond the map boundaries
        if (row >= this.mapHeight - 1 || column >= this.mapWidth - 1) return false;
    
        // Check all parts of a potential 2x2 gem block
        const offsets = [[0, 1], [1, 1], [1, 0]];
        for (const [delta_row, delta_col] of offsets) {
            let [treasure, digs] = this.map[row + delta_row][column + delta_col]
            if (digs != 2) {
                return false
            }
        }
        return true
    }

    randomChoice(options, weights) {
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let randomNum = Math.random() * totalWeight;
    
        for (let i = 0; i < weights.length; i++) {
            randomNum -= weights[i];
            if (randomNum < 0) {
                return i;
            }
        }
        return options.length - 1;
    }

    stampEarned(stamp) {
        this.users[0].addStamp(stamp)
        this.users[1].addStamp(stamp)
    }

    sendMove(args, user) {
        if (!this.started) {
            console.log("Game not started", this.playingUsers)
            return;
        }

        let moveType = this.isValidMove(user, args.move);
        if (moveType === false) {
            console.log(`Not valid move type for ${args.move}, ${user.username}`)
            return;
        }

        let move = this.makeMove(args.move, moveType);
        this[`player${this.currentTurn}Lives`]--;
        this.moves -= 1

        console.log("Current Turn before send_move", this.currentTurn, user.displayName)

        this.send('send_move', {
            turn: this.currentTurn,
            lives: this[`player${this.currentTurn}Lives`],
            coinsDiscovered: this.coinsDiscovered,
            gemsDiscovered: this.gemsDiscovered,
            emeraldDiscovered: this.emeraldDiscovered,
            ...move
        });

        if((this.gemsDiscovered + this.emeraldDiscovered) >= 2) {
            this.stampEarned(this.GEM_SKILLS_STAMP)
        }

        if(this.coinsDiscovered >= 8) {
            this.stampEarned(this.COLLECTOR_STAMP)
        }

        if(this.emeraldDiscovered >= 1) {
            this.stampEarned(this.IN_THE_ROUGH_STAMP)
        }

        if((this.gemsDiscovered + this.emeraldDiscovered) >= 1 && this.moves >= 6) {
            this.stampEarned(this.GEM_EXPERT_STAMP)
        }

        if((this.gemsDiscovered + this.emeraldDiscovered) >= 2 && this.moves >= 5) {
            this.stampEarned(this.GEM_PRO_STAMP)
        }

        let opponent = this.users[(this.currentTurn === 1) ? 1 : 0];

        if (this.player1Lives === 0 & this.player2Lives === 0) {
            setTimeout(() => {
                let total = (this.gemsDiscovered * this.gemValue) + (this.emeraldDiscovered * this.emeraldValue) + (this.coinsDiscovered * this.coinValue);
                user.updateCoins(total, true, 'treasurehunt');
                opponent.updateCoins(total, true, 'treasurehunt');

                this.reset();
                if (this?.room?.handler?.elasticsearch) {
                    let timeInGame = (Date.now() - this.startTime) / 1000
                    this.room.handler.elasticsearch.logMinigame(user, "treasurehunt", total, false, timeInGame)
                    this.room.handler.elasticsearch.logMinigame(opponent, "treasurehunt", total, false, timeInGame)
                }
            },1700)
            return;
        }

        this.currentTurn = (this.currentTurn === 1) ? 2 : 1;

        console.log("Current Turn after send_move", this.currentTurn, user.displayName)
    }

    isValidMove(user, move) {
        if (!isNumber(move)) {
            return false;
        }

        let turn = this.users.indexOf(user) + 1;

        if (turn != this.currentTurn) {
            return false;
        }

        let moveType;
        if (turn === 1) moveType = 'row';
        else if (turn === 2) moveType = 'column';

        return moveType;
    }

    makeMove(move, type) {
        const processTreasure = (row, column) => {
            let [treasureType, digState] = this.map[row][column];
    
            if (digState < 2) {
                this.map[row][column][1]++;
    
                if (this.map[row][column][1] === 2) {
                    switch (treasureType) {
                        case 1: // Coin
                            this.coinsDiscovered++;
                            //uncoveredTreasure = true;
                            break;
                        case 2: 
                            if (this.isGemUncovered(row, column)) {
                                this.gemsDiscovered++;
                            }
                            break;
                        case 3: // Adjacent Gem Part
                            let [treasure_row, treasure_col] = this.getGemByPiece(row, column)
                            let [treasure, digs] = this.map[treasure_row][treasure_col]
                            if (this.isGemUncovered(treasure_row, treasure_col)) {

                                if (treasure == 2) {
                                    this.gemsDiscovered++;
                                } else if (treasure == 4) {
                                    this.emeraldDiscovered++;
                                }
                            }
                            break;
                        case 4: // Emerald
                            if (this.isGemUncovered(row, column)) {
                                this.emeraldDiscovered ++
                            }
                            break;
                    }
                }
            }
        };
    
        if (type === 'row') {
            for (let column = 0; column < this.mapWidth; column++) {
                processTreasure(move, column);
            }
            this.rowsCleared[move] = 1
        } else if (type === 'column') {
            for (let row = 0; row < this.mapHeight; row++) {
                processTreasure(row, move);
            }
            this.columnsCleared[move] = 1
        }
    
        return {
            row: type === 'row' ? move : null,
            column: type === 'column' ? move : null
        };
    }

    toJSON() {
        return {
            users: this.playingUsers,
            map: this.map,
            rowsCleared: this.rowsCleared,
            columnsCleared: this.columnsCleared,
            lives: [this.player1Lives,this.player2Lives]
        }
    }
}
