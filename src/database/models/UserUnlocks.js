import BaseModel from '../BaseModel';

export default class UserUnlocks extends BaseModel {
  static init(sequelize, DataTypes) {
    return super.init(
      {
        id: {
          type: DataTypes.INTEGER(11),
          primaryKey: true,
        },
        userId: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
        },
        code: {
          type: DataTypes.STRING(45),
        },
      },
      { sequelize, timestamps: false, tableName: 'user_unlocks' }
    );
  }
}
