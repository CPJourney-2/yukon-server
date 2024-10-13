import BaseModel from "../BaseModel"

import Sequelize from "sequelize"

export default class Puffles extends BaseModel {
    static init(sequelize, DataTypes) {
        return super.init(
            {
                id: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true,
                },
                userId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                },
                type: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                },
                name: {
                    type: DataTypes.STRING(25),
                    allowNull: false,
                },
                energy: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    defaultValue: 100,
                },
                health: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    defaultValue: 100,
                },
                rest: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    defaultValue: 100,
                },
                adoption_date: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
                },
                last_feed: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
                },
                last_slept: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
                },
                postcard_hungry: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                }
            },
            {
                sequelize,
                timestamps: false,
                tableName: "user_puffles",
            }
        )
    }

    static associate({ users }) {
        this.belongsTo(users, {
            foreignKey: "userId",
        })
    }
}
