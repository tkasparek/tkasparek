"""
Download rivers data
"""
import configparser
import os
import sys
from datetime import datetime
from pathlib import Path

import psycopg2
import requests
from lxml import html
from psycopg2.extras import execute_values


def prepare_station_map(cur):
    """Prepare station map with time of latest update"""
    station_map = {}
    cur.execute("""SELECT rs.id, rs.chmi_id, max(rivdata.measurement_time) as measurement_time FROM river_station rs
                    LEFT OUTER JOIN river_data rivdata ON rs.id = rivdata.river_station_id GROUP BY rs.id, rs.chmi_id;""")
    for row in cur.fetchall():
        station_map[row[1]] = (row[0], row[2])
    return station_map


def store_station(conn, cur, chmi_key, station_map, station_data):
    """stores station details into DB"""
    river = station_data.xpath('/html/body/div[1]/div[3]/div/table[2]//tr[1]/td/div/table//tr[1]/td')[0].text_content()
    gauge = station_data.xpath('/html/body/div[1]/div[3]/div/table[2]//tr[1]/td/div/table//tr[2]/td')[0].text_content()
    category = station_data.xpath('/html/body/div[1]/div[3]/div/table[2]//tr[1]/td/div/table//tr[3]/td')[0].text_content()
    basin_number = station_data.xpath('/html/body/div[1]/div[3]/div/table[2]//tr[1]/td/div/table//tr[4]/td')[0].text_content()
    municipality = station_data.xpath('/html/body/div[1]/div[3]/div/table[2]//tr[1]/td/div/table//tr[5]/td')[0].text_content()
    gauge_operator = station_data.xpath('/html/body/div[1]/div[3]/div/table[2]//tr[1]/td/div/table//tr[6]/td')
    gauge_operator = gauge_operator[0].text_content() if gauge_operator else None

    flood_watch = station_data.xpath('/html/body/div[1]/div[3]/div/table[2]//tr[2]/td/table//tr[1]/td/table//tr[2]/td[2]/strong[2]')
    unit = 'cm' if flood_watch[0].text_content().endswith('[cm]') else 'flow' if flood_watch else None
    flood_watch = flood_watch[0].text_content() if flood_watch else None
    flood_warning = station_data.xpath('/html/body/div[1]/div[3]/div/table[2]//tr[2]/td/table//tr[1]/td/table//tr[3]/td[2]/strong[2]')
    flood_warning = flood_warning[0].text_content() if flood_warning else None
    flooding = station_data.xpath('/html/body/div[1]/div[3]/div/table[2]//tr[2]/td/table//tr[1]/td/table//tr[4]/td[2]/strong[2]')
    flooding = flooding[0].text_content() if flooding else None
    extreme_flooding = station_data.xpath('/html/body/div[1]/div[3]/div/table[2]//tr[2]/td/table//tr[1]/td/table//tr[5]/td[2]/strong[2]')
    extreme_flooding = extreme_flooding[0].text_content() if extreme_flooding else None
    drought = station_data.xpath('/html/body/div[1]/div[3]/div/table[2]//tr[2]/td/table//tr[1]/td/table//tr[6]/td[2]/strong[2]')
    drought = drought[0].text_content() if drought else None

    warning_valid = station_data.xpath('/html/body/div[1]/div[3]/div/table[2]//tr[2]/td/table//tr[2]/td/div/table//tr[2]/td')
    warning_valid = warning_valid[0].text_content().strip() if warning_valid else None

    cur.execute("""INSERT INTO river_station (chmi_id, name, gauge, category, basin_number, municipality, gauge_operator,
                                              flood_watch, flood_warning, flooding, extreme_flooding, drought, unit, warning_valid)
                    VALUES %s ON CONFLICT (chmi_id) DO UPDATE set name = %s RETURNING id AS inserted""",
                ((chmi_key, river, gauge, category, basin_number, municipality, gauge_operator, flood_watch, flood_warning,
                  flooding, extreme_flooding, drought, unit, warning_valid), river))
    conn.commit()
    inserted = cur.fetchone()
    station_map[chmi_key] = (inserted[0], None)


def store_data(connection_string):
    # pylint: disable=consider-using-f-string
    """Main function which expects connection string to DB is should save data to"""
    conn = psycopg2.connect(connection_string)
    cur = conn.cursor()

    page_template = 'https://hydro.chmi.cz/hpps_oplist.php?sort=0&sort_type=asc&startpage={}'
    station_map = prepare_station_map(cur)

    to_insert = []
    for page in range(1, 12):
        page_content = requests.get(page_template.format(page))
        tree = html.fromstring(page_content.content)
        data = tree.xpath('//div[@class="tborder"]//tr[position() > 2]/td[3]/a')
        for link in data:
            uri = link.values()[0]
            chmi_key = int(uri.split('?')[1].split('=')[1])
            detail = requests.get(f'https://hydro.chmi.cz/{uri}')
            station_data = html.fromstring(detail.content)
            if chmi_key not in station_map:
                store_station(conn, cur, chmi_key, station_map, station_data)
            note = station_data.xpath('/html/body/div[1]/div[3]/div/table[2]//tr[2]/td/table//tr[5]/td/div/table//tr[2]/td')
            note = note[0].text_content().strip() if note else None
            for tr in station_data.xpath('//table[@class="stdstationtbl"]//tr[3]/td/div/table//tr[position() > 1]'):
                measurement_time = datetime.strptime(tr[0].text_content(), '%d.%m.%Y %H:%M')

                if station_map[chmi_key][1] is None or station_map[chmi_key][1] < measurement_time:
                    to_insert.append((station_map[chmi_key][0],
                                     measurement_time,
                                     None if tr[1].text_content() == '' else tr[1].text_content(),
                                     None if tr[2].text_content() == '' else tr[2].text_content(),
                                     None if tr[3].text_content() == '' else tr[3].text_content(),
                                     note))

    if to_insert:
        execute_values(cur, """INSERT INTO river_data (river_station_id, measurement_time, gauge, flow, temperature, note) VALUES %s ON CONFLICT (river_station_id, measurement_time) DO NOTHING""",
                       to_insert, page_size=len(to_insert))
        conn.commit()

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
