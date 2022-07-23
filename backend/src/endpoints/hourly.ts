import { Op } from 'sequelize';
import { RainData, Station } from '../models';
import { IMeta, parsePagination } from '../utils';

interface IResponse {
    meta: IMeta;
    data: RainData[];
}

const hourly = async (day: string, queryParams: qs.ParsedQs): Promise<IResponse> => {
    const pagination = parsePagination(queryParams);
    const result = await RainData.findAndCountAll({
        attributes: ['Station.id', 'Station.name', 'rain', 'hour'],
        where: {
            hour: {
                [Op.not]: null,
            },
            day: {
                [Op.eq]: day,
            },
        },
        include: [{ model: Station, required: true, attributes: [] }],
        order: [
            ['rain', 'DESC'],
            [Station, 'name'],
        ],
        limit: pagination.limit,
        offset: pagination.offset,
        raw: true,
    });
    return {
        data: result.rows,
        meta: {
            total_items: result.count,
            page: pagination.offset / pagination.limit + 1,
            page_size: pagination.limit,
        },
    };
};

export default hourly;
