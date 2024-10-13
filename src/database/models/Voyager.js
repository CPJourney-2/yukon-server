import BaseModel from '../BaseModel'


export default class Voyager extends BaseModel {

    static init(sequelize, DataTypes) {
        return super.init(
            {
                userId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true
                },
                itemIds: {
                    type: DataTypes.STRING(500),
                    allowNull: false,
                    defaultValue: "",
                },
                pack1: {
                    type: DataTypes.TINYINT(1),
                    allowNull: false,
                    defaultValue: 0,
                },
                pack2: {
                    type: DataTypes.TINYINT(1),
                    allowNull: false,
                    defaultValue: 0,
                },
                pack3: {
                    type: DataTypes.TINYINT(1),
                    allowNull: false,
                    defaultValue: 0,
                },
                rerolls: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    defaultValue: 1,
                },
                is_pack_purchased: {
                    type: DataTypes.TINYINT(1),
                    defaultValue: false,
                },
            },
            { sequelize, timestamps: false, tableName: 'voyager' }
        )
    }

    static associate({ users }) {
        this.belongsTo(users, {
            foreignKey: 'userId'
        })
    }

}
