import "reflect-metadata";
import * as assert from "assert";
import {createConnection, getConnectionOptions} from "../../../src/index";
import rimraf from "rimraf";
import {dirname} from "path";
import {Connection} from "../../../src/connection/Connection";

describe("github issues > #799 sqlite: 'database' path should be created", () => {
    let connection: Connection;

    const path = `${__dirname}/tmp/sqlitedb.db`;
    const cleanup = (done: () => void) => {
        rimraf(dirname(path), () => {
            return done();
        });
    };

    before(cleanup);
    after(cleanup);

    afterEach(() => {
        if (connection && connection.isConnected) {
            connection.close();
        }
    });

    it("should create the whole path to database file", async function () {
        const options = await getConnectionOptions("sqlite");
        if ((<any>options).skip) return

        connection = await createConnection({
            "name": "sqlite",
            "type": "sqlite",
            "database": path
        });

        assert.strictEqual(connection.isConnected, true);
    });

    it("should create the whole path to database file for better-sqlite3", async function () {
        const options = await getConnectionOptions("better-sqlite3");
        if ((<any>options).skip) return

        connection = await createConnection({
            "name": "better-sqlite3",
            "type": "better-sqlite3",
            "database": path
        });

        assert.strictEqual(connection.isConnected, true);
    });

});
