-- represents region (Czech: kraj) of Czech republic
CREATE TABLE region (
    id SERIAL,
    internal_id INT NOT NULL UNIQUE,  -- ID used by CHMI application
    name TEXT NOT NULL UNIQUE,
    PRIMARY KEY (id)
) TABLESPACE pg_default;

-- insert regions manually as they're not expected to change
INSERT INTO region (name, internal_id) VALUES ('Hlavní město Praha', 19);
INSERT INTO region (name, internal_id) VALUES ('Středočeský kraj', 27);
INSERT INTO region (name, internal_id) VALUES ('Jihočeský kraj', 35);
INSERT INTO region (name, internal_id) VALUES ('Plzeňský kraj', 43);
INSERT INTO region (name, internal_id) VALUES ('Karlovarský kraj', 51);
INSERT INTO region (name, internal_id) VALUES ('Ústecký kraj', 60);
INSERT INTO region (name, internal_id) VALUES ('Liberecký kraj', 78);
INSERT INTO region (name, internal_id) VALUES ('Královéhradecký kraj', 86);
INSERT INTO region (name, internal_id) VALUES ('Pardubický kraj', 94);
INSERT INTO region (name, internal_id) VALUES ('Kraj Vysočina', 108);
INSERT INTO region (name, internal_id) VALUES ('Jihomoravský kraj', 116);
INSERT INTO region (name, internal_id) VALUES ('Olomoucký kraj', 124);
INSERT INTO region (name, internal_id) VALUES ('Moravskoslezský kraj', 132);
INSERT INTO region (name, internal_id) VALUES ('Zlínský kraj', 141);

-- rain measuring station
CREATE TABLE station (
    id SERIAL,
    internal_id INT NOT NULL UNIQUE,  -- ID used by CHMI application
    region_id INT NOT NULL,
    name TEXT NOT NULL,
    height DECIMAL(5,1),
    chmi_branch TEXT,
    basin TEXT,
    partial_basin TEXT,
    local_municipality TEXT,
    PRIMARY KEY (id),
        CONSTRAINT region_id
        FOREIGN KEY (region_id)
        REFERENCES region (id)
) TABLESPACE pg_default;

-- rain data for a station
-- hour can be NULLable and if set to null record represents rain for entire day
CREATE TABLE IF NOT EXISTS rain_data (
    id SERIAL,
    station_id INT NOT NULL,
    day DATE NOT NULL,
    hour SMALLINT,
    rain NUMERIC(4,1) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE(station_id, day, hour),
    CONSTRAINT station_id
        FOREIGN KEY (station_id)
        REFERENCES station (id)
) TABLESPACE pg_default;

-- most of the computing is done for entire day so create a partial index to speed things up
CREATE UNIQUE INDEX station_id_null_hour ON rain_data (station_id, day) WHERE hour IS NULL;

-- crate materialized views to cache outliers and statistics
-- as the records are inserted each day only once and in one transaction create also triggers which will automatically keep the views updated
--
-- With ~1 year worth of data and API running on RPi2 the execution time of getting statistics and outliers decreased 20 times by using these views
CREATE MATERIALIZED VIEW daily_records AS
    SELECT s.id AS station_id,
           s.name,
           rd.rain,
           rd.day
    FROM rain_data rd
        JOIN station s ON rd.station_id = s.id
    WHERE rd.hour IS NULL
    ORDER BY rd.rain DESC,
             s.name,
             rd.day
    LIMIT 1000;

CREATE OR REPLACE FUNCTION refresh_daily_records()
    RETURNS TRIGGER LANGUAGE plpgsql

    AS $$
    BEGIN
        REFRESH MATERIALIZED VIEW daily_records;
        RETURN NULL;
    END $$;

CREATE TRIGGER refresh_daily_records_tg
    AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE
    ON rain_data FOR EACH STATEMENT
    EXECUTE PROCEDURE refresh_daily_records();

CREATE MATERIALIZED VIEW hourly_records AS
    SELECT s.id AS station_id,
           s.name,
           rd.rain,
           rd.day,
           rd.hour
    FROM rain_data rd
        JOIN station s ON rd.station_id = s.id
    WHERE rd.hour IS NOT NULL
    ORDER BY rd.rain DESC,
             s.name,
             rd.day,
             rd.hour
    LIMIT 1000;

CREATE OR REPLACE FUNCTION refresh_hourly_records()
    RETURNS TRIGGER LANGUAGE plpgsql

    AS $$
    BEGIN
        REFRESH MATERIALIZED VIEW hourly_records;
        RETURN NULL;
    END $$;

CREATE TRIGGER refresh_hourly_records_tg
    AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE
    ON rain_data FOR EACH STATEMENT
    EXECUTE PROCEDURE refresh_hourly_records();

CREATE MATERIALIZED VIEW total_rain AS
    SELECT s.id AS station_id,
           s.name,
           SUM(rd.rain) AS rain,
           round(AVG(rd.rain), 2) AS avg_rain
    FROM rain_data rd
    JOIN station s ON rd.station_id = s.id
    WHERE rd.hour IS NULL
    GROUP BY s.id
    HAVING COUNT(rd.rain) > (SELECT COUNT(DISTINCT day) * 0.9 FROM rain_data)
    ORDER BY rain DESC,
             s.name;

CREATE OR REPLACE FUNCTION refresh_total_rain()
    RETURNS TRIGGER LANGUAGE plpgsql

    AS $$
    BEGIN
        REFRESH MATERIALIZED VIEW total_rain;
        RETURN NULL;
    END $$;

CREATE TRIGGER refresh_total_rain_tg
    AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE
    ON rain_data FOR EACH STATEMENT
    EXECUTE PROCEDURE refresh_total_rain();

CREATE MATERIALIZED VIEW daily_avgs AS
    SELECT rd.day as day,
           round(AVG(rd.rain), 3) AS avg_rain
        FROM rain_data rd
        WHERE rd.hour IS NULL
        GROUP BY rd.day
        ORDER BY day;

CREATE OR REPLACE FUNCTION refresh_daily_avgs()
    RETURNS TRIGGER LANGUAGE plpgsql

    AS $$
    BEGIN
        REFRESH MATERIALIZED VIEW daily_avgs;
        RETURN NULL;
    END $$;

CREATE TRIGGER refresh_daily_avgs_tg
    AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE
    ON rain_data FOR EACH STATEMENT
    EXECUTE PROCEDURE refresh_daily_avgs();

-- river measuring station
CREATE TABLE river_station (
    id SERIAL,
    chmi_id INT NOT NULL UNIQUE,  -- ID used by CHMI application
    name TEXT NOT NULL,
    gauge TEXT NOT NULL,
    category TEXT NOT NULL,
    basin_number TEXT NOT NULL,
    municipality TEXT NOT NULL,
    gauge_operator TEXT,

    flood_watch DECIMAL(5,1),
    flood_warning DECIMAL(5,1),
    flooding DECIMAL(5,1),
    extreme_flooding DECIMAL(5,1),
    drought DECIMAL(5,1),
    unit TEXT,

    warning_valid TEXT,

    PRIMARY KEY (id)
) TABLESPACE pg_default;

CREATE TABLE IF NOT EXISTS river_data (
    id BIGSERIAL,
    river_station_id INT NOT NULL,
    measurement_time TIMESTAMP,
    gauge INT,
    flow NUMERIC(8,4),
    temperature NUMERIC(5,2),
    note TEXT,
    PRIMARY KEY (id),
    UNIQUE(river_station_id, measurement_time),
    CONSTRAINT river_station_id
        FOREIGN KEY (river_station_id)
        REFERENCES river_station (id)
) TABLESPACE pg_default;
