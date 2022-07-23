import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model, NonAttribute, Sequelize } from 'sequelize';
import { db_config as config } from './config';

const sequelize = new Sequelize(config.db_name, config.db_user, config.db_password, {
    host: config.db_host,
    port: Number(config.db_port),
    dialect: 'postgres',
    dialectOptions: { decimalNumbers: true },
    ...(process.env.NODE_ENV === 'production' && { logging: false }),
});

class Region extends Model {
    declare id: number;
    declare internal_id: number;
    declare name: string;
}

Region.init(
    {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
        },
        internal_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        name: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'region',
        timestamps: false,
        underscored: true,
    }
);

class Station extends Model<InferAttributes<Station>, InferCreationAttributes<Station, { omit: 'Region' }>> {
    declare id: number;
    declare internal_id: number;
    declare region_id: ForeignKey<Region>;
    declare name: string;
    declare height: number;
    declare chmi_branch: string;
    declare basin: string;
    declare partial_basin: string;
    declare local_municipality: string;

    declare Region?: NonAttribute<Region>;
}

Station.init(
    {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
        },
        internal_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        region_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: Region,
                key: 'id',
            },
        },
        name: {
            type: DataTypes.TEXT,
        },
        height: {
            type: DataTypes.DECIMAL(5, 1),
        },
        chmi_branch: {
            type: DataTypes.TEXT,
        },
        basin: {
            type: DataTypes.TEXT,
        },
        partial_basin: {
            type: DataTypes.TEXT,
        },
        local_municipality: {
            type: DataTypes.TEXT,
        },
    },
    {
        sequelize,
        tableName: 'station',
        timestamps: false,
        underscored: true,
    }
);

Station.belongsTo(Region);
Region.hasMany(Station);

class RainData extends Model {
    declare id: number;
    declare station_id: number;
    declare day: string;
    declare hour: number;
    declare rain: number;
}

RainData.init(
    {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
        },
        station_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: Station,
                key: 'id',
            },
        },
        day: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        hour: {
            type: DataTypes.SMALLINT,
        },
        rain: {
            type: DataTypes.DECIMAL(4, 1),
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'rain_data',
        timestamps: false,
        underscored: true,
    }
);

RainData.belongsTo(Station);
Station.hasMany(RainData);

class DailyRecords extends Model {
    declare station_id: number;
    declare name: string;
    declare rain: number;
    declare day: string;
}

DailyRecords.init(
    {
        station_id: {
            type: DataTypes.INTEGER,
        },
        name: {
            type: DataTypes.TEXT,
        },
        rain: {
            type: DataTypes.DECIMAL(4, 1),
        },
        day: {
            type: DataTypes.DATEONLY,
        },
    },
    { sequelize, tableName: 'daily_records', timestamps: false, underscored: true }
);

class HourlyRecords extends Model {
    declare station_id: number;
    declare name: string;
    declare rain: number;
    declare day: string;
    declare hour: number;
}

HourlyRecords.init(
    {
        station_id: {
            type: DataTypes.INTEGER,
        },
        name: {
            type: DataTypes.TEXT,
        },
        rain: {
            type: DataTypes.DECIMAL(4, 1),
        },
        day: {
            type: DataTypes.DATEONLY,
        },
        hour: {
            type: DataTypes.SMALLINT,
        },
    },
    { sequelize, tableName: 'hourly_records', timestamps: false, underscored: true }
);

class TotalRain extends Model {
    declare station_id: number;
    declare name: string;
    declare rain: number;
}

TotalRain.init(
    {
        station_id: {
            type: DataTypes.INTEGER,
        },
        name: {
            type: DataTypes.TEXT,
        },
        rain: {
            type: DataTypes.DECIMAL(4, 1),
        },
    },
    { sequelize, tableName: 'total_rain', timestamps: false, underscored: true }
);

export { DailyRecords, HourlyRecords, RainData, Region, Station, TotalRain };
