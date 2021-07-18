#!/usr/bin/env bash

# exit when any command fails
set -e

npx rimraf build/compiled
npx tsc
cp /config/ormconfig.json build/compiled/ormconfig.json

if [ ! -f ormconfig.json ]; then
    cp ormconfig.json.dist ormconfig.json
fi
