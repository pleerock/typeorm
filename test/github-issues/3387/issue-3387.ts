import "reflect-metadata";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Connection} from "../../../src/connection/Connection";
import {expect} from "chai";
import { Table } from '../../../src';

describe("github issues > #1505 named columns", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        enabledDrivers: ["postgres"]
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should allow inserting named columns", () => Promise.all(connections.map(async connection => {
        
        // Create the categories table.
        const qr = connection.createQueryRunner();
        await qr.createTable(new Table({
            name: 'category',
            columns: [
                {
                    name: "id",
                    type: "int",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment"
                },
                {
                    name: "name",
                    type: "varchar",
                }
            ]
        }));

        const insert = connection.manager.insert('category', [
            { name: 'Easy' },
            { name: 'Medium' },
            { name: 'Hard' },
        ]);

        return expect(insert).to.fulfilled
    })));
});
