import { DailyRecords, HourlyRecords, TotalRain } from '../models';

interface IResponse {
    daily_maximums: DailyRecords[];
    hourly_maximums: HourlyRecords[];
    total_maximums: TotalRain[];
    total_minimums: TotalRain[];
}

const outliers = async (): Promise<IResponse> => {
    const daily_maximums = await DailyRecords.findAll({
        attributes: [['station_id', 'id'], 'name', 'rain', 'day'],
        limit: 10,
    });
    const hourly_maximums = await HourlyRecords.findAll({
        attributes: [['station_id', 'id'], 'name', 'rain', 'day', 'hour'],
        limit: 10,
    });

    const sums = await TotalRain.findAll({
        attributes: [['station_id', 'id'], 'name', 'rain'],
        limit: 10,
    });
    const sumsMin = await TotalRain.findAll({
        attributes: [['station_id', 'id'], 'name', 'rain'],
        limit: 10,
        order: ['rain'],
    });

    return {
        daily_maximums,
        hourly_maximums,
        total_maximums: sums,
        total_minimums: sumsMin,
    };
};

export default outliers;
