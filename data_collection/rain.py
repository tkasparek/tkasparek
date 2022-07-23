"""
Download rain data for previous day
"""
import configparser
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

import psycopg2
import requests
from lxml import html
from psycopg2.extras import execute_values

# The table on CHMI has 2 extra columns inserted into it so we need to map their columns into corresponding hour
COLUMN_MAP = [(2, 1), (3, 2), (4, 3), (5, 4), (6, 5), (7, 6), (8, 7), (10, 8), (11, 9), (12, 10), (13, 11), (14, 12), (15, 13),
              (16, 14), (17, 15), (18, 16), (19, 17), (20, 18), (21, 19), (22, 20), (23, 21), (24, 22), (25, 23), (26, 24)]


def create_station_map(cur):
    """Creates map of CHMI's ids (key) to database ids of measuring stations (value) for faster lookups and simpler DB queries"""
    station_map = {}
    cur.execute("""SELECT id, internal_id FROM station""")
    for row in cur.fetchall():
        station_map[row[1]] = row[0]
    return station_map


def select_regions(cur):
    """Get regions from DB"""
    regions = []
    cur.execute("""SELECT id, internal_id FROM region""")
    for row in cur.fetchall():
        regions.append(row)
    return regions


def create_station(cur, conn, station_map, table_row, region_id, internal_station_id):
    # pylint: disable=consider-using-f-string
    """In case there's a new station (or during a first run) we don't know, insert it into database and also add it to existing station map"""
    station_detail = requests.get('https://hydro.chmi.cz/hpps/{}'.format(table_row[0].getchildren()[0].get('onclick').split('\'')[1]))
    tree = html.fromstring(station_detail.content)
    data = tree.xpath('//div[@class="tborder tblpd"]/table/tr/*')
    name = data[1].text_content().strip()
    height = data[11].text_content().replace(',', '.')
    chmi_branch = data[3].text_content().strip()
    basin = data[5].text_content().strip()
    partial_basin = data[7].text_content().strip()
    local_mun = data[9].text_content().strip()

    cur.execute("""INSERT INTO station (internal_id, region_id, name, height, chmi_branch, basin, partial_basin, local_municipality)
                    VALUES %s ON CONFLICT (internal_id) DO UPDATE set name = %s RETURNING id AS inserted""",
                ((internal_station_id, region_id, name, height, chmi_branch, basin, partial_basin, local_mun), name))
    conn.commit()
    inserted = cur.fetchone()
    station_map[internal_station_id] = inserted[0]


def proces_tr(cur, conn, table_row, station_map, region_id, day_string):
    """Gets values from single row in the table"""
    internal_station_id = int(table_row[0].getchildren()[0].get('onclick').split('\'')[1].split('=')[1])
    if internal_station_id not in station_map:
        create_station(cur, conn, station_map, table_row, region_id, internal_station_id)
    values = []
    for pos, hour in COLUMN_MAP:
        values.append((station_map[internal_station_id], day_string, hour, float(
            table_row[pos].text_content().strip() if table_row[pos].text_content().strip() else 0)))
    values.append((station_map[internal_station_id], day_string, None, float(
        table_row[27].text_content().strip() if table_row[27].text_content().strip() else 0)))

    return values


def insert_data(cur, conn, to_insert):
    """Inserts all data into DB in a single transaction using execute_values which is way faster than iterating over rows and doing cur.execute()"""
    if to_insert:
        execute_values(cur, """INSERT INTO rain_data (station_id, day, hour, rain) VALUES %s ON CONFLICT (station_id, day, hour) DO NOTHING""",
                       to_insert, page_size=len(to_insert))
        conn.commit()


def store_data(connection_string):
    # pylint: disable=consider-using-f-string
    """Main function which expects connection string to DB is should save data to"""
    conn = psycopg2.connect(connection_string)
    cur = conn.cursor()

    station_map = create_station_map(cur)
    regions = select_regions(cur)

    day_offset = 1  # 1 means yesterday, 2 the day before yesterday, max CHMI allows is 7
    day_string = (datetime.now() - timedelta(abs(day_offset))).strftime('%Y-%m-%d')
    page_template = 'http://hydro.chmi.cz/hpps/hpps_act_rain.php?day_offset={}&fkraj={}'

    to_insert = []

    # iterate over regions, each of them has a table of stations which needs parsing
    # it's easier to it this way as region tables are not paginated than to deal with CHMI's terrible pagination
    for db_id, internal_id in regions:
        page_content = requests.get(page_template.format(day_offset, internal_id))
        tree = html.fromstring(page_content.content)

        data = tree.xpath('//div[@class="tsrz"]/table//tr[position()>1]')
        for table_row in data:
            to_insert.extend(proces_tr(cur, conn, table_row, station_map, db_id, day_string))

    insert_data(cur, conn, to_insert)

    cur.close()
    conn.close()


if __name__ == '__main__':

    def get_connection_string():
        """Constuct database connection string from the data in rain.cfg located in the same directory as the script"""
        current_dir = Path(__file__).resolve().parent
        full_path = os.path.join(current_dir, 'rain.cfg')
        if not os.path.exists(full_path):  # configparser does not throw an error if the config file does not exist
            sys.stderr.write(f'{full_path} config file does not exist\n')
            sys.exit(1)

        cfgparser = configparser.ConfigParser()
        cfgparser.read(full_path)
        if 'db_config' not in cfgparser:
            sys.stderr.write(f'"db_config" section missing in {full_path}\n')
            sys.exit(1)

        cfg = cfgparser['db_config']

        for cfg_param in ('db_name', 'db_user', 'db_password', 'db_host', 'db_port'):
            if cfg_param not in cfg:
                sys.stderr.write(f'"{cfg_param}" missing in {full_path}\n')
                sys.exit(1)

        return 'dbname={} user={} password={} host={} port={}'.format(cfg['db_name'], cfg['db_user'], cfg['db_password'], cfg['db_host'], cfg['db_port'])

    store_data(get_connection_string())
