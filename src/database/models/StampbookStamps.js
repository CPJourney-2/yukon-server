import BaseModel from '../BaseModel'


export default class StampbookStamps extends BaseModel {

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
                    allowNull: false
                },
                stampId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false
                },
                itemId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false
                },
                x: {
                    type: DataTypes.INTEGER(6),
                    allowNull: false
                },
                y: {
                    type: DataTypes.INTEGER(6),
                    allowNull: false
                },
                rotation: {
                    type: DataTypes.FLOAT(),
                    allowNull: false
                }
            },
            { sequelize, timestamps: false, tableName: 'stampbook_stamps' }
        )
    }

    static associate({ users }) {
        this.belongsTo(users, {
            foreignKey: 'userId'
        })
    }

}
