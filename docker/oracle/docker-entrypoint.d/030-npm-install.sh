#!/usr/bin/env bash

# exit when any command fails
set -e

if [[ $INSTALL == 0 ]] && [[ ! -f ./package.json ]]; then
    exit 0
fi

INSTALL=0
if [[ $INSTALL == 0 ]] && [[ "$(ls ./node_modules/ | wc -l | tr -d '\n')" == '0' ]]; then
    INSTALL=1
fi
if [[ $INSTALL == 0 ]] && [[ ! -f ./node_modules/.md5 ]]; then
    INSTALL=1
fi
if [[ $INSTALL == 0 ]] && ! md5sum --check ./node_modules/.md5; then
    INSTALL=1
fi

if [[ $INSTALL == 1 ]]; then
    npm ci --no-optional --ignore-scripts
    md5sum ./package-lock.json > ./node_modules/.md5
fi
