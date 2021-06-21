import "reflect-metadata";
import {Connection} from "../../../../src";
import {closeTestingConnections, createTestingConnections} from "../../../utils/test-utils";
import {expect} from "chai";

describe("indices > conditional index", () => {

    let connections: Connection[];
    before(async () => {
        connections = await createTestingConnections({
            entities: [__dirname + "/entity/*{.js,.ts}"],
            enabledDrivers: ["mssql", "postgres", "sqlite", "better-sqlite3"], // only these drivers supports conditional indices
            schemaCreate: true,
            dropSchema: true,
        });
    });
    after(() => closeTestingConnections(connections));

    it("should correctly create conditional indices with WHERE condition", () => Promise.all(connections.map(async connection => {

        const queryRunner = connection.createQueryRunner();
        let table = await queryRunner.getTable("post");

        table!.indices.length.should.be.equal(2);
        expect(table!.indices[0].where).to.be.not.empty;
        expect(table!.indices[1].where).to.be.not.empty;

        await queryRunner.release();

    })));

    it("should correctly drop conditional indices and revert drop", () => Promise.all(connections.map(async connection => {

        const queryRunner = connection.createQueryRunner();
        let table = await queryRunner.getTable("post");
        table!.indices.length.should.be.equal(2);
        expect(table!.indices[0].where).to.be.not.empty;
        expect(table!.indices[1].where).to.be.not.empty;

        await queryRunner.dropIndices(table!, [...table!.indices]);

        table = await queryRunner.getTable("post");
        table!.indices.length.should.be.equal(0);

        await queryRunner.executeMemoryDownSql();

        table = await queryRunner.getTable("post");
        table!.indices.length.should.be.equal(2);
        expect(table!.indices[0].where).to.be.not.empty;
        expect(table!.indices[1].where).to.be.not.empty;

        await queryRunner.release();

    })));
});
