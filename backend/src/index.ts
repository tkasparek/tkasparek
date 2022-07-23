import express from 'express';
import fs from 'fs';
import http from 'http';
import https from 'https';
import moment from 'moment';
import { https_config } from './config';
import daily from './endpoints/daily';
import histogram from './endpoints/histogram';
import hourly from './endpoints/hourly';
import outliers from './endpoints/outliers';
import station from './endpoints/station';
import stations from './endpoints/stations';

const DEFAULT_HEADERS = { 'Access-Control-Allow-Origin': '*' };

const start = (): void => {
    const app = express();

    app.get('/histogram', async (_req, res) => {
        histogram(moment().subtract('1', 'day').format('YYYY-MM-DD'))
            .then((retval) => {
                res.status(200).set(DEFAULT_HEADERS).json(retval);
            })
            .catch((err) => {
                res.status(500).set(DEFAULT_HEADERS).json({ error: err.message });
            });
    });

    app.get('/histogram/:day', async (req, res) => {
        histogram(req.params.day)
            .then((retval) => {
                res.status(200).set(DEFAULT_HEADERS).json(retval);
            })
            .catch((err) => {
                res.status(500).set(DEFAULT_HEADERS).json({ error: err.message });
            });
    });

    app.get('/rain/daily', async (req, res) => {
        daily(moment().subtract('1', 'day').format('YYYY-MM-DD'), req.query)
            .then((retval) => {
                res.status(200).set(DEFAULT_HEADERS).json(retval);
            })
            .catch((err) => {
                res.status(500).set(DEFAULT_HEADERS).json({ error: err.message });
            });
    });

    app.get('/rain/daily/:day', async (req, res) => {
        daily(req.params.day, req.query)
            .then((retval) => {
                res.status(200).set(DEFAULT_HEADERS).json(retval);
            })
            .catch((err) => {
                res.status(500).set(DEFAULT_HEADERS).json({ error: err.message });
            });
    });

    app.get('/rain/hourly', async (req, res) => {
        hourly(moment().subtract('1', 'day').format('YYYY-MM-DD'), req.query)
            .then((retval) => {
                res.status(200).set(DEFAULT_HEADERS).json(retval);
            })
            .catch((err) => {
                res.status(500).set(DEFAULT_HEADERS).json({ error: err.message });
            });
    });

    app.get('/rain/hourly/:day', async (req, res) => {
        hourly(req.params.day, req.query)
            .then((retval) => {
                res.status(200).set(DEFAULT_HEADERS).json(retval);
            })
            .catch((err) => {
                res.status(500).set(DEFAULT_HEADERS).json({ error: err.message });
            });
    });

    app.get('/outliers', async (_req, res) => {
        outliers()
            .then((retval) => {
                res.status(200).set(DEFAULT_HEADERS).json(retval);
            })
            .catch((err) => {
                res.status(500).set(DEFAULT_HEADERS).json({ error: err.message });
            });
    });

    app.get('/stations', async (req, res) => {
        stations(req.query)
            .then((retval) => {
                res.status(200).set(DEFAULT_HEADERS).json(retval);
            })
            .catch((err) => {
                res.status(400).set(DEFAULT_HEADERS).json({ error: err.message });
            });
    });

    app.get('/stations/:id', async (req, res) => {
        const station_id = Number(req.params.id);
        if (isNaN(station_id)) {
            res.status(400).set(DEFAULT_HEADERS).json({ error: 'station_id must be number' });
            return;
        }
        station(station_id)
            .then(([retval, http_code]) => {
                res.status(http_code).set(DEFAULT_HEADERS).json(retval);
            })
            .catch((err) => {
                res.status(500).set(DEFAULT_HEADERS).json({ error: err.message });
            });
    });

    const http_server = http.createServer(app);

    if (https_config !== undefined) {
        // TODO: add error handling
        const private_key = fs.readFileSync(https_config.private_key, 'utf8');
        const certificate = fs.readFileSync(https_config.cert, 'utf8');
        const ca = fs.readFileSync(https_config.ca_cert, 'utf8');

        const credentials = {
            key: private_key,
            cert: certificate,
            ca: ca,
        };

        const https_server = https.createServer(credentials, app);

        https_server.listen(8443);
    }

    http_server.listen(8080);
};

export default { start };

if (require.main === module) {
    start();
}
