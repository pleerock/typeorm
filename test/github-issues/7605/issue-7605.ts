import "reflect-metadata";
import {
    closeTestingConnections,
    createTestingConnections,
    reloadTestingDatabases,
} from "../../utils/test-utils";
import { Connection } from "../../../src/connection/Connection";
import { Foo } from "./entity/foo";
import { expect } from "chai";

describe("github issues > #7605 Giving 'column \"response.created\" must appear in the GROUP BY clause or be used in an aggregate function', but it does", () => {
    let connections: Connection[];
    before(
        async () =>
            (connections = await createTestingConnections({
                entities: [__dirname + "/entity/*{.js,.ts}"],
                enabledDrivers: ["postgres", "cockroachdb", "mssql"],
            }))
    );
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should use the same parameter index for all ocurrences of a parameter on drivers that use indexed parameters", () =>
        Promise.all(
            connections.map(async connection => {
                let query = connection.getRepository(Foo)
                    .createQueryBuilder()
                    .addSelect(`created at time zone :tz as "creationDate"`)
                    .where("created in (:...dates)")
                    .groupBy("created at time zone :tz")
                    .setParameter("tz", "GMT+03:00")
                    .setParameter("dates", ["2020-01-01", "2020-01-02"]);

                let parametersUsed = query.getQueryAndParameters()[1];
                expect(parametersUsed).to.be.eql(["GMT+03:00", "2020-01-01", "2020-01-02"]);
            })
        ));
});
