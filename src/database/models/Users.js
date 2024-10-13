import BaseModel from '../BaseModel';

import pick from '@utils/pick';

import Sequelize from 'sequelize';

export default class Users extends BaseModel {
  static init(sequelize, DataTypes) {
    return super.init(
      {
        id: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        username: {
          type: DataTypes.STRING(12),
          allowNull: false,
        },
        password: {
          type: DataTypes.STRING(60),
          allowNull: false,
        },
        loginKey: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        rank: {
          type: DataTypes.INTEGER(1),
          allowNull: false,
          defaultValue: 1,
        },
        streamer: {
          type: DataTypes.TINYINT,
          allowNull: false,
          defaultValue: 0,
        },
        muted: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: 0,
        },
        permaBan: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: 0,
        },
        ipBan: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: 0,
        },
        joinTime: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        },
        coins: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          defaultValue: 500,
        },
        gems: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          defaultValue: 0,
        },
        partyCoins : {
          type: DataTypes.INTEGER(11),
          allowNull: true,
          defaultValue: 0,
        },
        head: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          defaultValue: 0,
        },
        face: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          defaultValue: 0,
        },
        neck: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          defaultValue: 0,
        },
        body: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          defaultValue: 0,
        },
        hand: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          defaultValue: 0,
        },
        feet: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          defaultValue: 0,
        },
        color: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          defaultValue: 1,
        },
        photo: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          defaultValue: 0,
        },
        flag: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          defaultValue: 0,
        },
        transform: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          defaultValue: 0,
        },
        username_verified: {
          type: DataTypes.TINYINT,
          allowNull: false,
          defaultValue: 0,
        },
        username_rejected: {
          type: DataTypes.TINYINT,
          allowNull: false,
          defaultValue: 0,
        },
        email_verified: {
          type: DataTypes.TINYINT,
          allowNull: false,
          defaultValue: 0,
        },
        walking: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          defaultValue: 0,
        },
        lastLogin: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        cj_xp: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          defaultValue: 0,
        },
        cj_belt: {
          type: DataTypes.STRING(12),
          allowNull: true,
        },
        cj_wins: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          defaultValue: 0,
        },
        color_vote: {
          type: DataTypes.TINYINT,
          allowNull: false,
          defaultValue: 0,
        },
        igloo_contest: {
          type: DataTypes.TINYINT,
          allowNull: false,
          defaultValue: 0,
        },
        pirate_status: {
          type: DataTypes.TINYINT,
          allowNull: false,
          defaultValue: 0,
        },
        presents_collected: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: 0,
        },
        igloo_slot: {
          type: DataTypes.TINYINT,
          allowNull: false,
          defaultValue: 0,
        },
        inf_skill_points: {
          type: DataTypes.TINYINT,
          allowNull: false,
          defaultValue: 0,
        },
        highest_floor_reached: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
        }
      },
      { sequelize, timestamps: false, tableName: 'users' }
    );
  }

  static associate(db) {
    this.hasOne(db.authTokens, {
      foreignKey: 'userId',
      as: 'authToken',
    });
    this.hasOne(db.bans, {
      foreignKey: 'userId',
      as: 'ban',
    });
    this.hasOne(db.mutes, {
      foreignKey: 'userId',
      as: 'mute',
    });
    this.hasOne(db.mascots, {
      foreignKey: 'id',
      as: 'mascot',
    });
    this.hasOne(db.stampbooks, {
      foreignKey: 'userId',
      as: 'stampbook',
    });
    this.hasMany(db.buddies, {
      foreignKey: 'userId',
      as: 'buddies',
    });
    this.belongsTo(db.buddies, {
      foreignKey: 'id',
    });
    this.hasMany(db.buddyRequests, {
      foreignKey: 'recipientId',
      as: 'buddyRequests',
    });
    this.belongsTo(db.buddyRequests, {
      foreignKey: 'id',
    });
    this.hasMany(db.ignores, {
      foreignKey: 'userId',
      as: 'ignores',
    });
    this.belongsTo(db.ignores, {
      foreignKey: 'id',
    });
    this.hasMany(db.inventories, {
      foreignKey: 'userId',
      as: 'inventory',
    });
    this.hasMany(db.iglooInventories, {
      foreignKey: 'userId',
      as: 'igloos',
    });
    this.hasMany(db.furnitureInventories, {
      foreignKey: 'userId',
      as: 'furniture',
    });
    this.hasMany(db.flooringInventories, {
      foreignKey: 'userId',
      as: 'flooring',
    });
    this.hasMany(db.musicInventories, {
      foreignKey: 'userId',
      as: 'music',
    });
    this.hasMany(db.igloos, {
      foreignKey: 'userId',
      as: 'userIgloos'
    });
    this.hasMany(db.locationInventories, {
      foreignKey: 'userId',
      as: 'locations',
    });
    this.hasMany(db.fingerprints, {
      foreignKey: 'userId',
      as: 'fingerprint',
    });
    this.hasMany(db.scavengerItems, {
      foreignKey: 'userId',
      as: 'scavenger',
    });
    this.hasMany(db.stamps, {
      foreignKey: 'userId',
      as: 'stamps',
    });
    this.hasMany(db.puffles, {
      foreignKey: 'userId',
      as: 'puffles',
    });
    this.hasMany(db.postcards, {
      foreignKey: 'recipientId',
      as: 'postcards',
    });
    this.hasMany(db.popupInteractions, {
      foreignKey: 'userId',
      as: 'popupInteractions',
    });
}

  get anonymous() {
    return pick(
      this,
      'id',
      'username',
      'displayName',
      'head',
      'face',
      'neck',
      'body',
      'hand',
      'feet',
      'color',
      'photo',
      'flag',
      'transform',
      'username_verified',
      'username_rejected',
      'email_verified',
      'walking',
      'walkingPuffleType',
      'joinTime',
      'igloo_slot',
    );
  }

  get displayName() {
    if (this.mascot) return this.mascot.name;
    if (this.username_verified) return this.username;
    return `P${this.id}`;
  }

  get mascotGiveaway() {
    return this.mascot?.giveaway;
  }
}
