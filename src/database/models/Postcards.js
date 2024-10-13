import BaseModel from '../BaseModel'
import Sequelize from 'sequelize'


export default class Postcards extends BaseModel {

    static init(sequelize, DataTypes) {
        return super.init(
            {
                id: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true
                },
                senderId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false
                },
                recipientId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false
                },
                postcardId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false
                },
                extra: {
                    type: DataTypes.STRING(20),
                    allowNull: true
                },
                date: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
                },
                seen: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: 0
                }
            },
            { sequelize, timestamps: false, tableName: 'postcards' }
        )
    }

    static associate({ users }) {
        this.belongsTo(users, {
            foreignKey: 'senderId',
            as: 'sender'
        })

        this.belongsTo(users, {
            foreignKey: 'recipientId',
            as: 'recipient'
        })
    }

    toJSON() {
        return {
            'id': this.id,
            'username': this.sender?.displayName,
            'senderId': this.senderId,
            'postcardId': this.postcardId,
            'extra': this.extra,
            'date': this.date
        }
    }

}
