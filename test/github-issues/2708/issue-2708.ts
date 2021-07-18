import "reflect-metadata";
import {createTestingConnections, closeTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Connection} from "../../../src/connection/Connection";
import {User} from "./entity/User";
import {expect} from "chai";

describe("github issues > #2708 Bug in queryBuildier when summing", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        schemaCreate: true,
        dropSchema: true,
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("SUM should return a number", () => Promise.all(connections.map(async function(connection) {
        const user = new User();
        await connection.manager.save(user);


        const {sum} = await connection
            .getRepository(User)
            .createQueryBuilder("user")
            .select("SUM(user.id)", "sum")
            .getRawOne();

        expect(sum).to.be.a("number")

    })));

});
