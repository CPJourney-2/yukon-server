import BaseModel from '../BaseModel'

import Sequelize from 'sequelize'


export default class PopupInteractions extends BaseModel {

    static init(sequelize, DataTypes) {
        return super.init(
            {
                id: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true
                },
                userId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                },
                popupName: {
                    type: DataTypes.STRING(255),
                    allowNull: false
                },
            },
            { sequelize, timestamps: false, tableName: 'popup_interactions' }
        )
    }

    static associate({ users }) {
        this.belongsTo(users, {
            foreignKey: 'userId'
        })
    }

}
