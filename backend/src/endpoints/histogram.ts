import { Op } from 'sequelize';
import { RainData } from '../models';

interface IResponse {
    data: {
        0: number;
        10: number;
        25: number;
        50: number;
        100: number;
        1000: number;
    };
}

const histogram = async (day: string): Promise<IResponse> => {
    const retval = {
        data: {
            0: 0,
            10: 0,
            25: 0,
            50: 0,
            100: 0,
            1000: 0,
        },
    };
    const total = await RainData.findAll({
        attributes: ['rain'],
        where: {
            hour: {
                [Op.is]: null,
            },
            day: {
                [Op.eq]: day,
            },
        },
        raw: true,
    });
    total.forEach((row) => {
        row.rain == 0 && retval.data[0]++;
        row.rain > 0 && row.rain < 10 && retval.data[10]++;
        row.rain >= 10 && row.rain < 25 && retval.data[25]++;
        row.rain >= 25 && row.rain < 50 && retval.data[50]++;
        row.rain >= 50 && row.rain < 100 && retval.data[100]++;
        row.rain >= 100 && retval.data[1000]++;
    });
    return retval;
};

export default histogram;
