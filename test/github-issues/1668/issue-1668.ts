import { closeTestingConnections, createTestingConnections, reloadTestingDatabases } from "../../utils/test-utils";
import { Connection } from "../../../src/connection/Connection";
import { expect } from "chai";
import { C } from "./entity/c";
import { A } from "./entity/a";
import { B } from "./entity/b";

describe("github issues > #1668 Wrong repository order with multiple TransactionRepository inside a Transaction decorator", () => {
    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [B, A, C]
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should generate correct query when getting relation", () => Promise.all(connections.map(async connection => {
        const a = new A();
        a.id = 5;
        await connection.manager.save(a);

        const b = new B();
        b.barId = 5;
        b.fooCode = "foobar";
        await connection.manager.save(b);

        const c = new C();
        c.id = 1;
        c.barId = 5;
        c.fooCode = "foobar";

        await connection.manager.save(c);

        const loadedC = await connection.manager
            .getRepository(C)
            .findOne({ where: { id: 1 }, relations: ["a"]});

        expect(loadedC!.id).to.be.equal(1);
    })));

});
