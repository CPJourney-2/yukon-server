import BaseModel from '../BaseModel';

export default class UserTickets extends BaseModel {
  static init(sequelize, DataTypes) {
    return super.init(
      {
        userId: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
        },
        tickets: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          defaultvalue: 0,
        },
      },
      { sequelize, timestamps: false, tableName: 'user_tickets' }
    );
  }
}
