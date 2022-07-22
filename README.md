# Hello there

I am Tomáš Kašpárek, software engineering manager with extensive software engineering and security background currently working at Red Hat.

# My projects and work experience

-   [https://tkasparek-rain.duckdns.org](https://tkasparek-rain.duckdns.org) small personal project providing a better view on rain data in the Czech republic. Hosted on [Oracle Free Cloud](https://www.oracle.com/cloud/free/), running on Oracle Linux 8 with data being stored in a PostgreSQL database and connections being encrypted thanks to [Let's Encrypt](https://letsencrypt.org/). Data collection part is written in Python, backend and frontend both in TypeScript. You may be asking why I’ve used TypeScript for backend - I’ve done my share of backends written in Python (see my work experience) and wanted to try something else.
    -   [Data collection](https://github.org/tkasparek/tkasparek/tree/master/data_collection) - simple web scraper written in python + database schema
    -   Here will be link to backend code
    -   And here to frontend code
-   [Spacewalk](https://github.com/spacewalkproject/spacewalk) - open source free system system management solution on which [Red Hat Satellite 5](<https://en.wikipedia.org/wiki/Satellite_(software)#Red_Hat_Satellite_5>) was built. I’ve done my share of maintenance of legacy software which consists of Java, Python, Perl and a huge amount of database stored procedures. Fun fact: Spacewalk codebase is so old, that the famous log4j [CVE-2021-44228](https://nvd.nist.gov/vuln/detail/CVE-2021-44228) wasn’t yet present.
-   [vulnerability-engine](https://github.com/RedHatInsights/vulnerability-engine) - backend for automatic detection of security vulnerabilities featured in the Red Hat Insights application bundle. Containerized Python application broken into a set of smaller components which are being run in the OpenShift cluster.
-   [VMaaS](https://github.com/RedHatInsights/vmaas) - datasource for vulnerability-engine. Containerized Python application broken into a set of smaller components which are being run in the OpenShift cluster.
-   [vulnerability-ui](https://github.com/tkasparek/vulnerability-ui) - JavaScript UI for [vulnerability-engine](https://github.com/RedHatInsights/vulnerability-engine) written in React, utilizing [Patternfly React](https://www.patternfly.org/v4/get-started/develop/) library.
-   Tens of other contributions to other open source projects such from bug fixes and features to CVE fixes.

## Other tech interests

-   Home automation using [Home Assistant](https://www.home-assistant.io/)
