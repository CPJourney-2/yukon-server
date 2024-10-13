import BaseModel from '../BaseModel'

import Sequelize from 'sequelize'


export default class Reports extends BaseModel {
    static init(sequelize, DataTypes) {
        return super.init(
            {
                id: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true
                },
                datetime: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
                },
                reportedId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: true
                },
                reportedById: {
                    type: DataTypes.INTEGER(11),
                    allowNull: true
                },
                room: {
                    type: DataTypes.STRING(60),
                    allowNull: false
                },
                reason: {
                    type: DataTypes.STRING(250),
                    allowNull: false
                },
                message: {
                    type: DataTypes.STRING(250),
                    allowNull: true
                },
                resolved: {
                    type: DataTypes.TINYINT,
                    allowNull: false,
                    defaultValue: 0
                },
            },
            { sequelize, timestamps: false, tableName: 'reports' }
        )
    }
}
