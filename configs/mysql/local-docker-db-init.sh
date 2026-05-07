#!/bin/bash
# LOCAL DEVELOPMENT ONLY — do not use these broad grants in production.
#
# Prisma Migrate creates and drops a temporary shadow database with a
# random name, so it requires global privileges.
# This is safe here because the MySQL instance is a disposable Docker container.
mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<EOF
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES
ON *.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;
EOF
