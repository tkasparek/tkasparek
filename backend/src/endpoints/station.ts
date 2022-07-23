import moment from 'moment';
import { Op } from 'sequelize';
import { RainData, Region, Station } from '../models';

interface IResponse {
    id: number;
    height: number;
    name: string;
    chmi_branch: string;
    basin: string;
    partial_basin: string;
    local_municipality: string;
    region_name: string | undefined; // TODO: figure out undefined as we're explicitly asking to include Region based on NOT NULL region_id
    top_days: RainData[];
    top_hours: RainData[];
    last_month: RainData[];
    last_week: RainData[];
}

const station = async (stationId: number): Promise<[IResponse | { error: string }, number]> => {
    const detail = await Station.findByPk(stationId, { include: Region });
    if (detail === null) {
        return [{ error: 'Station not found' }, 404];
    }

    const topDays = await RainData.findAll({
        attributes: ['day', 'rain'],
        limit: 10,
        where: {
            station_id: {
                [Op.eq]: stationId,
            },
            hour: {
                [Op.is]: null,
            },
        },
        order: [['rain', 'DESC'], 'id'],
    });

    const topHours = await RainData.findAll({
        attributes: ['day', 'hour', 'rain'],
        limit: 10,
        where: {
            station_id: {
                [Op.eq]: stationId,
            },
            hour: {
                [Op.not]: null,
            },
        },
        order: [['rain', 'DESC'], 'id'],
    });

    const lastWeek = await RainData.findAll({
        attributes: ['day', 'hour', 'rain'],
        where: {
            station_id: {
                [Op.eq]: stationId,
            },
            hour: {
                [Op.not]: null,
            },
            day: {
                [Op.gt]: moment().subtract(8, 'day').format('YYYY-MM-DD'),
            },
        },
        order: ['day', 'hour'],
    });

    const lastMonth = await RainData.findAll({
        attributes: ['day', 'rain'],
        where: {
            station_id: {
                [Op.eq]: stationId,
            },
            hour: {
                [Op.is]: null,
            },
            day: {
                [Op.gt]: moment().subtract(31, 'day').format('YYYY-MM-DD'),
            },
        },
        order: ['day', 'hour'],
    });

    return [
        {
            id: detail.id,
            height: detail.height,
            name: detail.name,
            chmi_branch: detail.chmi_branch,
            basin: detail.basin,
            partial_basin: detail.partial_basin,
            local_municipality: detail.local_municipality,
            region_name: detail.Region && detail.Region.name,
            top_days: topDays,
            top_hours: topHours,
            last_month: lastMonth,
            last_week: lastWeek,
        },
        200,
    ];
};

export default station;
