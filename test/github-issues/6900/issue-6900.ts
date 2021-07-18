import { expect } from "chai";
import { MongoClient } from "mongodb";
import {
    closeTestingConnections, reloadTestingDatabases,
    setupTestingConnections
} from "../../utils/test-utils";
import {MongoDriver} from "../../../src/driver/mongodb/MongoDriver";
import {Connection, ConnectionOptions, createConnection} from "../../../src";
import {Warn} from "./entity/Warn";
import {MongoConnectionOptions} from "../../../src/driver/mongodb/MongoConnectionOptions";

describe("github issues > #6900 MongoDB ConnectionManager doesn't select given database, creates new database \"test\" instead", () => {
    let connections: Connection[] = [];
    afterEach(async () => {
        await closeTestingConnections(connections);
        connections.length = 0;
    });

    it("should connect to the expected database", async () => {
        const options = setupTestingConnections({ enabledDrivers: ["mongodb"] });

        if (options.length === 0) {
            // Skip if we can't grab the mongodb
            return;
        }

        const host: string = (options[0] as MongoConnectionOptions).host || "localhost";

        const connection = await createConnection({
            ...options[0],
            url: `mongodb://${host}`,
            database: "foo"
        } as ConnectionOptions);
        connections.push(connection);

        await reloadTestingDatabases(connections);

        const mongoDriver = connection.driver as MongoDriver ;
        const client = (mongoDriver.queryRunner!.databaseConnection as any) as MongoClient;

        expect(client.db().databaseName).to.be.equal("foo");
        expect(mongoDriver.database).to.be.equal("foo");
    });

    it("should write data to the correct database", async () => {
        const options = setupTestingConnections({ enabledDrivers: ["mongodb"] });

        if (options.length === 0) {
            // Skip if we can't grab the mongodb
            return;
        }

        const host: string = (options[0] as MongoConnectionOptions).host || "localhost";

        const connection = await createConnection({
            ...options[0],
            entities: [ Warn ],
            url: `mongodb://${host}`,
            database: "foo"
        } as ConnectionOptions);
        connections.push(connection);

        await reloadTestingDatabases(connections);

        const repo = connection.getRepository(Warn);

        await repo.insert({
            guild: "Hello",
            user: "WORLD",
            moderator: "Good Moderator",
            reason: "For Mongo not writing correctly to the databsae!",
            createdAt: new Date()
        });

        const mongoDriver = connection.driver as MongoDriver ;
        const client = (mongoDriver.queryRunner!.databaseConnection as any) as MongoClient;

        expect(await client.db("foo").collection("warnings").count({})).to.be.greaterThan(0);
    });
});
