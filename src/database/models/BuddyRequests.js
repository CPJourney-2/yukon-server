import BaseModel from '../BaseModel'


export default class BuddyRequests extends BaseModel {

    static init(sequelize, DataTypes) {
        return super.init(
            {
                senderId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true
                },
                recipientId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true
                },
                seen: {
                    type: DataTypes.TINYINT(1),
                    allowNull: false,
                    defaultValue: 0
                }
            },
            { sequelize, timestamps: false, tableName: 'buddy_requests' }
        )
    }

    static associate({ users }) {
        this.belongsTo(users, {
            foreignKey: 'recipientId'
        })
        this.hasOne(users, {
            foreignKey: 'id',
            sourceKey: 'senderId',
            as: 'user'
        })
    }

}
