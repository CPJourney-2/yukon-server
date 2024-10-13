import BaseModel from '../BaseModel';
import Sequelize from 'sequelize';

export default class UserQuests extends BaseModel {
  static init(sequelize, DataTypes) {
    return super.init(
      {
        questId: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
        },
        partyId: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
        },
        userId: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            primaryKey: true,
        },
        datetime: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        },
      },
      { sequelize, timestamps: false, tableName: 'user_quests' }
    );
  }
}
