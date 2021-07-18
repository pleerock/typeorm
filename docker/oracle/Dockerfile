FROM node:12

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get -qq -y install libaio1 && \
    apt-get -q -y autoremove && \
    rm -Rf /var/lib/apt/lists/*

WORKDIR /typeorm
ENTRYPOINT ["/docker-entrypoint.sh"]

COPY . /
RUN chmod 0755 /docker-entrypoint.sh

ENV PATH="$PATH:/typeorm/node_modules/.bin"
ENV LD_LIBRARY_PATH="/typeorm/node_modules/oracledb/instantclient_19_8/:$LD_LIBRARY_PATH"
ENV BLOB_URL="https://download.oracle.com/otn_software/linux/instantclient/19800/instantclient-basiclite-linux.x64-19.8.0.0.0dbru.zip"

CMD ["npm", "run", "test-fast"]
