import "reflect-metadata";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Connection} from "../../../src/connection/Connection";
import {expect} from "chai";
import {Category} from "./entity/Category";
import { CategoryRepository } from "./repository/CategoryRepository";

describe("github issues > #1505 nested transactions", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        enabledDrivers: ["postgres"]
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should rollback the outer transaction and save nothing into the database", () => Promise.all(connections.map(async connection => {
        const repo = connection.getCustomRepository(CategoryRepository);
        const category = new Category();

        try {
            await repo.triggerNestedTransactionError(category); // Should fail
            throw new Error();
        } catch {
            // Check that the post information was not saved.
            const categories = await connection.createQueryBuilder(Category, "category").getMany();
            expect(categories, "Nested transaction: Outer transaction failed to rollback. Inner transaction already committed the changes.").to.length(0);
        }
    })));

    it("should detect that a transaction is already running and use savepoints", () => Promise.all(connections.map(async connection => {
        const repo = connection.getCustomRepository(CategoryRepository);
        const category = new Category();

        connection.query("START TRANSACTION;");
        await repo.triggerTransactionSuccess(category);
        connection.query("ROLLBACK;");

        // Check that the post information was not saved.
        const categories = await connection.createQueryBuilder(Category, "category").getMany();
        expect(categories, "Nested transaction: Outer transaction failed to rollback. Inner transaction already committed the changes.").to.length(0);
    })));

});
