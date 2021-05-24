import "reflect-metadata";
import {expect} from "chai";
import {Connection} from "../../../src/connection/Connection";
import {CockroachDriver} from "../../../src/driver/cockroachdb/CockroachDriver";
import {closeTestingConnections, createTestingConnections} from "../../utils/test-utils";
import {AbstractSqliteDriver} from "../../../src/driver/sqlite-abstract/AbstractSqliteDriver";
import {PostgresDriver} from "../../../src/driver/postgres/PostgresDriver";
import {TableColumn} from "../../../src";

describe("query runner > change column", () => {

    let connections: Connection[];
    before(async () => {
        connections = await createTestingConnections({
            entities: [__dirname + "/entity/*{.js,.ts}"],
            schemaCreate: true,
            dropSchema: true,
        });
    });
    after(() => closeTestingConnections(connections));

    it("should correctly change column and revert change", () => Promise.all(connections.map(async connection => {

        // CockroachDB does not allow changing primary columns and renaming constraints
        if (connection.driver instanceof CockroachDriver)
            return;

        const queryRunner = connection.createQueryRunner();
        let table = await queryRunner.getTable("post");

        const nameColumn = table!.findColumnByName("name")!;
        nameColumn!.default!.should.exist;
        nameColumn!.isUnique.should.be.false;

        const changedNameColumn = nameColumn.clone();
        changedNameColumn.default = undefined;
        changedNameColumn.isUnique = true;
        changedNameColumn.isNullable = true;
        changedNameColumn.length = "500";
        await queryRunner.changeColumn(table!, nameColumn, changedNameColumn);

        table = await queryRunner.getTable("post");
        expect(table!.findColumnByName("name")!.default).to.be.undefined;
        table!.findColumnByName("name")!.isUnique.should.be.true;
        table!.findColumnByName("name")!.isNullable.should.be.true;

        // SQLite does not impose any length restrictions
        if (!(connection.driver instanceof AbstractSqliteDriver))
            table!.findColumnByName("name")!.length!.should.be.equal("500");

        const textColumn = table!.findColumnByName("text")!;
        const changedTextColumn = textColumn.clone();
        changedTextColumn.name = "description";
        changedTextColumn.isPrimary = true;
        changedTextColumn.default = "'default text'";
        await queryRunner.changeColumn(table!, textColumn, changedTextColumn);

        // column name was changed to 'description'
        table = await queryRunner.getTable("post");
        table!.findColumnByName("description")!.isPrimary.should.be.true;
        table!.findColumnByName("description")!.default!.should.exist;

        let idColumn = table!.findColumnByName("id")!;
        let changedIdColumn = idColumn.clone();
        changedIdColumn!.isPrimary = false;
        await queryRunner.changeColumn(table!, idColumn, changedIdColumn);

        table = await queryRunner.getTable("post");
        table!.findColumnByName("id")!.isPrimary.should.be.false;

        await queryRunner.executeMemoryDownSql();

        table = await queryRunner.getTable("post");
        table!.findColumnByName("id")!.isPrimary.should.be.true;
        table!.findColumnByName("name")!.default!.should.exist;
        table!.findColumnByName("name")!.isUnique.should.be.false;
        table!.findColumnByName("name")!.isNullable.should.be.false;
        table!.findColumnByName("text")!.isPrimary.should.be.false;
        expect(table!.findColumnByName("text")!.default).to.be.undefined;

        await queryRunner.release();
    })));

    it("should correctly change column 'isGenerated' property and revert change", () => Promise.all(connections.map(async connection => {

        // CockroachDB does not allow changing generated columns in existent tables
        if (connection.driver instanceof CockroachDriver)
            return;

        const queryRunner = connection.createQueryRunner();
        let table = await queryRunner.getTable("post");
        let idColumn = table!.findColumnByName("id")!;
        let changedIdColumn = idColumn.clone();

        changedIdColumn.isGenerated = true;
        changedIdColumn.generationStrategy = "increment";
        await queryRunner.changeColumn(table!, idColumn, changedIdColumn);

        table = await queryRunner.getTable("post");
        table!.findColumnByName("id")!.isGenerated.should.be.true;
        table!.findColumnByName("id")!.generationStrategy!.should.be.equal("increment");

        await queryRunner.executeMemoryDownSql();
        queryRunner.clearSqlMemory();

        table = await queryRunner.getTable("post");
        table!.findColumnByName("id")!.isGenerated.should.be.false;
        expect(table!.findColumnByName("id")!.generationStrategy).to.be.undefined;

        table = await queryRunner.getTable("post");
        idColumn = table!.findColumnByName("id")!;
        changedIdColumn = idColumn.clone();
        changedIdColumn.isPrimary = false;
        await queryRunner.changeColumn(table!, idColumn, changedIdColumn);

        // check case when both primary and generated properties set to true
        table = await queryRunner.getTable("post");
        idColumn = table!.findColumnByName("id")!;
        changedIdColumn = idColumn.clone();
        changedIdColumn.isPrimary = true;
        changedIdColumn.isGenerated = true;
        changedIdColumn.generationStrategy = "increment";
        await queryRunner.changeColumn(table!, idColumn, changedIdColumn);

        table = await queryRunner.getTable("post");
        table!.findColumnByName("id")!.isGenerated.should.be.true;
        table!.findColumnByName("id")!.generationStrategy!.should.be.equal("increment");

        await queryRunner.executeMemoryDownSql();
        queryRunner.clearSqlMemory();

        table = await queryRunner.getTable("post");
        table!.findColumnByName("id")!.isGenerated.should.be.false;
        expect(table!.findColumnByName("id")!.generationStrategy).to.be.undefined;

        await queryRunner.release();

    })));

    it("should correctly change generated as expression", () => Promise.all(connections.map(async connection => {

        // Only works on postgres
        if (!(connection.driver instanceof PostgresDriver)) return;

        const queryRunner = connection.createQueryRunner();

        // Database is running < postgres 12
        if (!await connection.driver.isGeneratedColumnsSupported(queryRunner)) return;

        let generatedColumn = new TableColumn({
            name: "generated",
            type: "character varying",
            generatedType: "STORED",
            asExpression: "text || tag"
        });

        let table = await queryRunner.getTable("post");

        await queryRunner.addColumn(table!, generatedColumn);

        table = await queryRunner.getTable("post");

        generatedColumn = table!.findColumnByName("generated")!;
        generatedColumn!.generatedType!.should.be.equals("STORED");
        generatedColumn!.asExpression!.should.be.equals("text || tag");

        let changedGeneratedColumn = generatedColumn.clone();
        changedGeneratedColumn.asExpression = "text || tag || name";

        await queryRunner.changeColumn(table!, generatedColumn, changedGeneratedColumn);

        table = await queryRunner.getTable("post");
        generatedColumn = table!.findColumnByName("generated")!;
        generatedColumn!.generatedType!.should.be.equals("STORED");
        generatedColumn!.asExpression!.should.be.equals("text || tag || name");

        changedGeneratedColumn = generatedColumn.clone();
        delete changedGeneratedColumn.generatedType;
        await queryRunner.changeColumn(table!, generatedColumn, changedGeneratedColumn);

        table = await queryRunner.getTable("post");
        generatedColumn = table!.findColumnByName("generated")!;
        generatedColumn!.should.not.haveOwnProperty("generatedType");
        generatedColumn!.should.not.haveOwnProperty("asExpression");

        changedGeneratedColumn = generatedColumn.clone();
        changedGeneratedColumn.asExpression = "text || tag || name";
        changedGeneratedColumn.generatedType = "STORED";
        await queryRunner.changeColumn(table!, generatedColumn, changedGeneratedColumn);

        table = await queryRunner.getTable("post");
        generatedColumn = table!.findColumnByName("generated")!;
        generatedColumn!.generatedType!.should.be.equals("STORED");
        generatedColumn!.asExpression!.should.be.equals("text || tag || name");
    })));
});
