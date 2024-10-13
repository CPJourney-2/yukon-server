import BaseModel from '../BaseModel';
import Sequelize from 'sequelize'

export default class UserDonations extends BaseModel {
  static init(sequelize, DataTypes) {
    return super.init(
      {
        userId: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
        },
        donationTotal: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          defaultvalue: 0,
        },
        donationCooldown: {
          type: Sequelize.DATE,
          allowNull: false
        },
      },
      { sequelize, timestamps: false, tableName: 'user_donations' }
    );
  }
}
