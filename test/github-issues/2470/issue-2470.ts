import "reflect-metadata";

import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";

import {Connection} from "../../../src/connection/Connection";
import { Building } from "./entity/Building";
import { Constructor } from "./entity/Constructor";
import { QueryFailedError } from "../../../src";
import {expect} from "chai";

describe("github issues > #2470 - Error persisting quoted field names inside entity", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        schemaCreate: true,
        dropSchema: true,
        logging: true
    }));

    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should persist quoted field", () => Promise.all(
      connections.map(async connection => {

        const constructorRepo = connection.getRepository(Constructor);
        const buildingRepo = connection.getRepository(Building);

        const constructor = new Constructor();
        constructor.name = "Company X";

        await constructorRepo.save(constructor);

        const building = new Building();
        building.city = "Amsterdam";
        building["constructor"] = constructor;

        try {
            await buildingRepo.save(building);
            expect.fail(); // TODO: not reaching this point, should be removed.
        } catch (e) {
            // TODO: remove this later.
            e.should.be.instanceOf(QueryFailedError);
            e.message.should.be.eql("SQLITE_ERROR: no such column: object Object");
            e.query.should.be.eql("INSERT INTO \"building\"(\"city\", \"constructor_id\") VALUES (?, [object Object])");
        }
      })
    ));
});
