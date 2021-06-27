import sinon from "sinon";
import {Connection} from "../../../src/connection/Connection";
import {createTestingConnections, closeTestingConnections, reloadTestingDatabases } from "../../utils/test-utils";
import { SimpleConsoleLogger, EntityManager } from "../../../src";
import { Foo } from "./entity/Foo";

describe("other issues > capture custom user data in logger (e.g. trace id)", () => {
    let connections: Connection[];
    let manager: EntityManager;
    let logQueryStub: sinon.SinonStub;
    const testFoo: Foo = {
        id: 1,
        name: "foo",
    };

    before(async() => {
        logQueryStub = sinon.stub(SimpleConsoleLogger.prototype, "logQuery");
        connections = await createTestingConnections({
            enabledDrivers: ["postgres"],
            entities: [Foo],
            logging: true,
            createLogger: () => new SimpleConsoleLogger(),
        });
    });
    beforeEach(async () => {
        await reloadTestingDatabases(connections);
        await Promise.all(connections.map(connection => connection.getRepository(Foo).insert(testFoo)));
    });
    afterEach(async () => {
        await Promise.all(connections.map(connection => connection.getRepository(Foo).delete({})));
        logQueryStub.resetHistory();
    });
    after(() => {
        closeTestingConnections(connections);
        logQueryStub.restore();
    });

    describe("when attaching user data to request-scoped entity manager", () => {

        const tests = [{
            testTarget: "entity manager query",
            testFunc: async() => await manager.query("SELECT * FROM foo"),
            loggerArgs: [
                ["SELECT * FROM foo", undefined]
            ],
        },{
            testTarget: "entity manager transaction",
            testFunc: async() => await manager.transaction(trx => trx.query("SELECT * FROM foo")),
            loggerArgs: [
                ["START TRANSACTION", undefined],
                ["SELECT * FROM foo", undefined],
                ["COMMIT", undefined]
            ],
        }, {
            testTarget: "repository save query",
            testFunc: async() => await manager.getRepository(Foo).save({id: 2, name: "secondFoo"}),
            loggerArgs: [
                ["START TRANSACTION", undefined],
                [`INSERT INTO "foo"("name", "delete_date") VALUES ($1, DEFAULT) RETURNING "id", "delete_date"`, ["secondFoo"]],
                ["COMMIT", undefined]
            ],
        }, {
            testTarget: "repository remove query",
            testFunc: async() => await manager.getRepository(Foo).remove({id: 2, name: "secondFoo"}),
            loggerArgs: [
                ["START TRANSACTION", undefined],
                [`DELETE FROM "foo" WHERE "id" = $1`, [2]],
                ["COMMIT", undefined]
            ],
        }, {
            testTarget: "repository soft remove query",
            testFunc: async() => await manager.getRepository(Foo).softRemove({id: 1, name: "foo"}),
            loggerArgs: [
                ["START TRANSACTION", undefined],
                [`UPDATE "foo" SET "delete_date" = CURRENT_TIMESTAMP WHERE "id" IN ($1)`, [1]],
                ["COMMIT", undefined]
            ],
        }, {
            testTarget: "repository recover query",
            testFunc: async() => await manager.getRepository(Foo).recover({id: 1, name: "foo"}),
            loggerArgs: [
                ["START TRANSACTION", undefined],
                [`UPDATE "foo" SET "delete_date" = NULL WHERE "id" IN ($1)`, [1]],
                ["COMMIT", undefined]
            ],
        }, {
            testTarget: "repository insert query",
            testFunc: async() => await manager.getRepository(Foo).insert({id: 2, name: "secondFoo"}),
            loggerArgs: [
                [`INSERT INTO "foo"("name", "delete_date") VALUES ($1, DEFAULT) RETURNING "id", "delete_date"`, ["secondFoo"]]
            ],
        }, {
            testTarget: "repository update query",
            testFunc: async() => await manager.getRepository(Foo).update(1, {name: "foo2"}),
            loggerArgs: [
                [`UPDATE "foo" SET "name" = $2 WHERE "id" IN ($1)`, [1, "foo2"]]
            ],
        }, {
            testTarget: "repository delete query",
            testFunc: async() => await manager.getRepository(Foo).delete({}),
            loggerArgs: [
                [`DELETE FROM "foo"`, []]
            ],
        }, {
            testTarget: "repository soft-delete query",
            testFunc: async() => await manager.getRepository(Foo).softDelete({}),
            loggerArgs: [
                [`UPDATE "foo" SET "delete_date" = CURRENT_TIMESTAMP`, []]
            ],
        }, {
            testTarget: "repository restore query",
            testFunc: async() => await manager.getRepository(Foo).restore({id: 1}),
            loggerArgs: [
                [`UPDATE "foo" SET "delete_date" = NULL WHERE "id" = $1`, [1]]
            ],
        }, {
            testTarget: "repository count query",
            testFunc: async() => await manager.getRepository(Foo).count(),
            loggerArgs: [
                [`SELECT COUNT(1) AS "cnt" FROM "foo" "Foo" WHERE "Foo"."delete_date" IS NULL`, []]
            ],
        }, {
            testTarget: "repository find query",
            testFunc: async() => await manager.getRepository(Foo).find(),
            loggerArgs: [
                [`SELECT "Foo"."id" AS "Foo_id", "Foo"."name" AS "Foo_name", "Foo"."delete_date" AS "Foo_delete_date" FROM "foo" "Foo" WHERE "Foo"."delete_date" IS NULL`, []]
            ],
        }, {
            testTarget: "repository findAndCount query",
            testFunc: async() => await manager.getRepository(Foo).findAndCount(),
            loggerArgs: [
                [`SELECT "Foo"."id" AS "Foo_id", "Foo"."name" AS "Foo_name", "Foo"."delete_date" AS "Foo_delete_date" FROM "foo" "Foo" WHERE "Foo"."delete_date" IS NULL`, []]
            ],
        }, {
            testTarget: "repository findByIds",
            testFunc: async() => await manager.getRepository(Foo).findByIds([1]),
            loggerArgs: [
                [`SELECT "Foo"."id" AS "Foo_id", "Foo"."name" AS "Foo_name", "Foo"."delete_date" AS "Foo_delete_date" FROM "foo" "Foo" WHERE ( "Foo"."id" IN ($1) ) AND ( "Foo"."delete_date" IS NULL )`, [1]]
            ],
        },{
            testTarget: "repository findOne query",
            testFunc: async() => await manager.getRepository(Foo).findOne(),
            loggerArgs: [
                [`SELECT "Foo"."id" AS "Foo_id", "Foo"."name" AS "Foo_name", "Foo"."delete_date" AS "Foo_delete_date" FROM "foo" "Foo" WHERE "Foo"."delete_date" IS NULL LIMIT 1`, []]
            ],
        }, {
            testTarget: "repository clear query",
            testFunc: async() => await manager.getRepository(Foo).clear(),
            loggerArgs: [
                [`TRUNCATE TABLE "foo"`, undefined]
            ],
        }, {
            testTarget: "repository increment query",
            testFunc: async() => await manager.getRepository(Foo).increment({}, "id", 1),
            loggerArgs: [
                [`UPDATE "foo" SET "id" = "id" + 1`, []]
            ],
        }];

        tests.forEach(({testTarget, testFunc, loggerArgs}) => {
            it(`${testTarget} passes the data to the logger`, async () => Promise.all(connections.map(async connection => {
                manager = connection.createEntityManager();
                manager.data = { trace_id: "request-id" };
                await testFunc();
                loggerArgs.forEach((args: [string, any]) => {
                    sinon.assert.calledWith(
                        logQueryStub,
                        args[0], // query
                        args[1], // params
                        sinon.match.hasNested("data.trace_id", "request-id"), // queryRunner with trace_id
                    );
                });
            })));
        });
    });
});
