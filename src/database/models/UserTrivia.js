import BaseModel from '../BaseModel';

export default class UserTrivia extends BaseModel {
  static init(sequelize, DataTypes) {
    return super.init(
      {
        userId: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
        },
        roomId: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
          defaultValue: 0
        },
      },
      { sequelize, timestamps: false, tableName: 'user_trivia' }
    );
  }
}
