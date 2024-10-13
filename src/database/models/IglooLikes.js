import BaseModel from '../BaseModel'
import Sequelize from 'sequelize';


export default class IglooLikes extends BaseModel {

    static init(sequelize, DataTypes) {
        return super.init(
            {
                userID: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true
                },
                likerID: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true
                },
                slotID: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true
                },
                createdAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
                }
            },
            { sequelize, timestamps: false, tableName: 'igloo_likes' }
        )
    }

    static associate({ users }) {
        this.belongsTo(users, {
            foreignKey: 'userId'
        })
    }

}
