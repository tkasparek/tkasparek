import fs from 'fs';
import ini from 'ini';

let config: { [key: string]: { [key: string]: string } };
try {
    config = ini.parse(fs.readFileSync('./rain.cfg', 'utf-8'));
} catch (e) {
    console.error('Missing configuration file');
    process.exit(1);
}

const { db_config, https_config } = config;

export { db_config, https_config };
