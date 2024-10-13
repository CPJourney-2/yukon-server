import BaseModel from '../BaseModel';

export default class DonationMasterCount extends BaseModel {
  static init(sequelize, DataTypes) {
    return super.init(
      {
        category: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
          defaultvalue: 1,
        },
        total: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          defaultvalue: 0,
        },
      },
      { sequelize, timestamps: false, tableName: 'donation_master_count' }
    );
  }
}
