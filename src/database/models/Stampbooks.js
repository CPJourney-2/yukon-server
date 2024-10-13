import BaseModel from '../BaseModel'


export default class Stampbooks extends BaseModel {

    static init(sequelize, DataTypes) {
        return super.init(
            {
                userId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true
                },
                colour: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false
                },
                clasp: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false
                },
                highlight: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false
                },
                pattern: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false
                }
            },
            { sequelize, timestamps: false, tableName: 'stampbooks' }
        )
    }

    static associate({ users }) {
        this.belongsTo(users, {
            foreignKey: 'userId'
        })
    }

}
