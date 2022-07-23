# Backend

Backend exposing data from the database filled by data collection piece, written in TypeScript, built on top of Express and Sequelize. As I’ve done my share of backends in Python I’ve decided to try something else and learn something new, hence TypeScript.

## The stack

The two main dependencies of the application are:

-   [express](https://expressjs.com/)
-   [sequelize](https://sequelize.org/)

## Configuration

The application expects `rain.cfg` in its working root. For details, please see the example. `db_config` section is required, while `https_config` is optional (if filled the app will run on HTTPS as well in addition to HTTP).

The service was developed as a systemd service to be run on a VM hence the approach with the config file. In the cloud environment the right thing to do would be to read configuration from environment variables.

The HTTPS is optional for use cases where encryption is provided by things like istio sidecar.

## Running as systemd service

See [rain-backend.service](rain-backend.service) and replace `${BUILD_PATH}` with the actual path of the build. The `rain.cfg` configuration file should be placed in the `${WORKDIR_PATH}`.
