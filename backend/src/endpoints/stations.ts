import { Op, Sequelize } from 'sequelize';
import { Region, Station } from '../models';
import { IMeta, parsePagination } from '../utils';

const addFilters = (queryParams: qs.ParsedQs): { name?: { [Op.iLike]: string } } => {
    return {
        ...((queryParams.filter as qs.ParsedQs) &&
            (queryParams.filter as qs.ParsedQs).name && {
                name: {
                    [Op.iLike]: '%' + (queryParams.filter as qs.ParsedQs).name + '%',
                },
            }),
    };
};

interface IResponse {
    meta: IMeta;
    data: Station[];
}

const stations = async (queryParams: qs.ParsedQs): Promise<IResponse> => {
    const pagination = parsePagination(queryParams);
    const stations = await Station.findAndCountAll({
        attributes: ['id', 'name', 'height', [Sequelize.col('Region.name'), 'region_name'], 'basin'],
        include: [{ model: Region, required: true, attributes: [] }],
        order: ['name', 'height'],
        limit: pagination.limit,
        offset: pagination.offset,
        where: Object.assign({}, addFilters(queryParams)),
        raw: true,
    });
    return {
        data: stations.rows,
        meta: {
            total_items: stations.count,
            page: pagination.offset / pagination.limit + 1,
            page_size: pagination.limit,
        },
    };
};

export default stations;
