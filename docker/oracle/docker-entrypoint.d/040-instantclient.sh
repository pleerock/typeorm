#!/usr/bin/env bash

# exit when any command fails
set -e

if [ ! -d node_modules/oracledb/instantclient_19_8 ]; then
    curl -sf -o node_modules/oracledb/instantclient.zip $BLOB_URL
    unzip -qqo node_modules/oracledb/instantclient.zip -d node_modules/oracledb/
    rm node_modules/oracledb/instantclient.zip
    cp /lib/*/libaio.so.* node_modules/oracledb/instantclient_19_8/
fi

