# Data storing

Data for the application is being scraped everyday from Czech Hydrometeorological Institute and stored in a PostgreSQL database.

## Setting up PostgreSQL database

Assuming one uses a distribution which uses `dnf` as distribution's package manager.

```
sudo dnf install postgresql-server
```

On RHEL8, CentOS8 or Oracle Linux 8 modularity can provide different versions of PostgreSQL other than the default one. This can be achieved by:

```
sudo dnf module enable postgresql:12
```

The instance running on [tkasparek-rain.duckdns.org]() is running on PostgreSQL 12 on Oracle Linux 8.

## Creating database schema

Database needs to be initialized first:

```
sudo /usr/bin/postgresql-setup --initdb
```

Start it and enable it.

```
sudo systemctl start postgresql.service && sudo systemctl enable postgresql.service
```

Switch to `postgres` user and create database user and database a let the user own it.

```
psql <<< "create user rain_user with password 'rain_pwd';"
psql <<< "create database rain_db owner = 'rain_user';"
```

Exit back to your user as the next step is to edit `pg_hba.conf` to allow `rain_user` to log in using an encrypted password.
Following lines need to be added to `/var/lib/pgsql/data/pg_hba.conf`:

```
local   rain_db         rain_user                               scram-sha-256
host    rain_db         rain_user       127.0.0.1/32            scram-sha-256
host    rain_db         rain_user       ::1/128                 scram-sha-256
```

These lines need to be added above already existing records so `pg_hba.conf` looks like this:

```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   rain_db         rain_user                               scram-sha-256
host    rain_db         rain_user       127.0.0.1/32            scram-sha-256
host    rain_db         rain_user       ::1/128                 scram-sha-256
# "local" is for Unix domain socket connections only
local   all             all                                     peer
# IPv4 local connections:
host    all             all             127.0.0.1/32            ident
# IPv6 local connections:
host    all             all             ::1/128                 ident
# Allow replication connections from localhost, by a user with the
# replication privilege.
local   replication     all                                     peer
host    replication     all             127.0.0.1/32            ident
host    replication     all             ::1/128                 ident
```

And restart postgresql to pick up the changes in the `pg_hba.conf` (or send SIGHUP signal to postgres).

```
sudo systemctl restart postgresql.service
```

Test that everything works and create the DB schema from [schema.sql]().

```
PGPASSWORD=rain_pwd psql -U rain_user -d rain_db < schema.sql
```

## Data storing

Data storing is done using [rain.py]() script which expects [rain.cfg]() file holding database connection configuration in the same directory.
Data collecting is done once every day, for the previous day. This can be easily automated using `cron`, by editing the `crontab` using `crontab -e` add following line:

```
0 6 * * * python3 ${PATH_TO_PARENT_DIR}/rain.py
```

This way the data gathering script will be run every day once at 6:00 AM.
