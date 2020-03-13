import "reflect-metadata";
import {Connection} from "../../../src/connection/Connection";
import {createTestingConnections, closeTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Flight} from "./entity/Flight";
import {PostgresDriver} from "../../../src/driver/postgres/PostgresDriver";
import {expect} from "chai";

describe("github issues > #838 Time zones for timestamp columns are incorrectly fetched and persisted in PostgreSQL", () => {

    let connections: Connection[];
    let postgresConnection: Connection;
    const testDateString = "1989-08-16T10:00:00+03:00";

    before(async () => {
        connections = await createTestingConnections({
            entities: [__dirname + "/entity/*{.js,.ts}"],
            enabledDrivers: [
                "postgres"
            ]
        });
        postgresConnection = connections.find(connection => connection.driver instanceof PostgresDriver)!;
    });

    beforeEach(() => reloadTestingDatabases(connections));

    after(() => closeTestingConnections(connections));

    it("should return date & time stored in PostgreSQL database correctly", async () => {
        // await postgresConnection.query(`INSERT INTO "flight" ("id", "date") VALUES (1, '1989-08-16 14:00:00.000000 +03:00');`);
        // const results = await postgresConnection.query(`SELECT date FROM "flight" WHERE id = 1`);
        // console.log(results);
        if (!postgresConnection) {
            return;
        }
        await postgresConnection.query(`INSERT INTO "flight" ("id", "date") VALUES (1, '${testDateString}');`);
        const flight = await postgresConnection.manager.findOne(Flight, 1);
        expect(flight!.date.toISOString()).to.equal(new Date(testDateString).toISOString());
    });

    it("should persist date & time to the PostgreSQL database correctly", async () => {
        if (!postgresConnection) {
            return;
        }
        const testDate = new Date(testDateString);
        await postgresConnection.manager.save(new Flight(1, testDate));

        const results = await postgresConnection.query(`SELECT "date" FROM "flight" WHERE id = 1`);

        expect(results[0].date.toISOString()).to.equal(testDate.toISOString());

    });

});
