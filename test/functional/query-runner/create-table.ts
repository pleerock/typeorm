import "reflect-metadata";
import { expect } from "chai";
import { Connection } from "../../../src/connection/Connection";
import { CockroachDriver } from "../../../src/driver/cockroachdb/CockroachDriver";
import { SapDriver } from "../../../src/driver/sap/SapDriver";
import { closeTestingConnections, createTestingConnections } from "../../utils/test-utils";
import { Table } from "../../../src/schema-builder/table/Table";
import { TableOptions } from "../../../src/schema-builder/options/TableOptions";
import { Post } from "./entity/Post";
import { MysqlDriver } from "../../../src/driver/mysql/MysqlDriver";
import { AbstractSqliteDriver } from "../../../src/driver/sqlite-abstract/AbstractSqliteDriver";
import { OracleDriver } from "../../../src/driver/oracle/OracleDriver";
import { Photo } from "./entity/Photo";
import { Book2, Book } from "./entity/Book";

describe("query runner > create table", () => {

    let connections: Connection[];
    before(async () => {
        connections = await createTestingConnections({
            entities: [__dirname + "/entity/*{.js,.ts}"],
            dropSchema: true,
        });
    });
    after(() => closeTestingConnections(connections));

    it("should correctly create table from simple object and revert creation", () => Promise.all(connections.map(async connection => {

        const queryRunner = connection.createQueryRunner();
        const options: TableOptions = {
            name: "category",
            columns: [
                {
                    name: "id",
                    type: connection.driver instanceof AbstractSqliteDriver ? "integer" : "int",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment"
                },
                {
                    name: "name",
                    type: "varchar",
                    isUnique: true,
                    isNullable: false
                }
            ]
        };

        await queryRunner.createTable(new Table(options), true);

        let table = await queryRunner.getTable("category");
        const idColumn = table!.findColumnByName("id");
        const nameColumn = table!.findColumnByName("name");
        idColumn!.should.be.exist;
        idColumn!.isPrimary.should.be.true;
        idColumn!.isGenerated.should.be.true;
        idColumn!.generationStrategy!.should.be.equal("increment");
        nameColumn!.should.be.exist;
        nameColumn!.isUnique.should.be.true;
        table!.should.exist;
        if (!(connection.driver instanceof MysqlDriver) && !(connection.driver instanceof SapDriver))
            table!.uniques.length.should.be.equal(1);

        await queryRunner.executeMemoryDownSql();
        table = await queryRunner.getTable("category");
        expect(table).to.be.undefined;

        await queryRunner.release();
    })));

    it("should correctly create table from Entity", () => Promise.all(connections.map(async connection => {

        const queryRunner = connection.createQueryRunner();
        const metadata = connection.getMetadata(Post);
        const newTable = Table.create(metadata, connection.driver);
        await queryRunner.createTable(newTable);

        const table = await queryRunner.getTable("post");
        const idColumn = table!.findColumnByName("id");
        const versionColumn = table!.findColumnByName("version");
        const nameColumn = table!.findColumnByName("name");
        table!.should.exist;
        if (!(connection.driver instanceof MysqlDriver) && !(connection.driver instanceof SapDriver)) {
            table!.uniques.length.should.be.equal(2);
            table!.checks.length.should.be.equal(1);
        }

        idColumn!.isPrimary.should.be.true;
        versionColumn!.isUnique.should.be.true;
        nameColumn!.default!.should.be.exist;

        await queryRunner.release();
    })));

    it("should correctly create table with all dependencies and revert creation", () => Promise.all(connections.map(async connection => {

        const queryRunner = connection.createQueryRunner();

        await queryRunner.createTable(new Table({
            name: "person",
            columns: [
                {
                    name: "id",
                    type: "int",
                    isPrimary: true
                },
                {
                    name: "userId",
                    type: "int",
                    isPrimary: true
                },
                {
                    name: "name",
                    type: "varchar",
                }
            ]
        }), true);

        const questionTableOptions = <TableOptions>{
            name: "question",
            columns: [
                {
                    name: "id",
                    type: connection.driver instanceof AbstractSqliteDriver ? "integer" : "int",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment"
                },
                {
                    name: "name",
                    type: "varchar",
                },
                {
                    name: "text",
                    type: "varchar",
                    isNullable: false
                },
                {
                    name: "authorId",
                    type: "int"
                },
                {
                    name: "authorUserId",
                    type: "int"
                }
            ],
            indices: [{ columnNames: ["authorId", "authorUserId"], isUnique: true }],
            foreignKeys: [
                {
                    columnNames: ["authorId", "authorUserId"],
                    referencedTableName: "person",
                    referencedColumnNames: ["id", "userId"]
                }
            ]
        };

        if (connection.driver instanceof MysqlDriver || connection.driver instanceof SapDriver) {
            questionTableOptions.indices!.push({ columnNames: ["name", "text"] });
        } else {
            questionTableOptions.uniques = [{ columnNames: ["name", "text"] }];
            questionTableOptions.checks = [{ expression: `${connection.driver.escape("name")} <> 'ASD'` }];
        }

        await queryRunner.createTable(new Table(questionTableOptions), true);

        const categoryTableOptions = <TableOptions>{
            name: "category",
            columns: [
                {
                    name: "id",
                    type: connection.driver instanceof AbstractSqliteDriver ? "integer" : "int",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment"
                },
                {
                    name: "name",
                    type: "varchar",
                    default: "'default category'",
                    isUnique: true,
                    isNullable: false
                },
                {
                    name: "alternativeName",
                    type: "varchar",
                },
                {
                    name: "questionId",
                    type: "int",
                    isUnique: true
                }
            ],
            foreignKeys: [
                {
                    columnNames: ["questionId"],
                    referencedTableName: "question",
                    referencedColumnNames: ["id"]
                }
            ]
        };

        if (connection.driver instanceof MysqlDriver || connection.driver instanceof SapDriver) {
            categoryTableOptions.indices = [{ columnNames: ["name", "alternativeName"] }];
        } else {
            categoryTableOptions.uniques = [{ columnNames: ["name", "alternativeName"] }];
        }

        // When we mark column as unique, MySql create index for that column and we don't need to create index separately.
        if (!(connection.driver instanceof MysqlDriver) && !(connection.driver instanceof OracleDriver) && !(connection.driver instanceof SapDriver))
            categoryTableOptions.indices = [{ columnNames: ["questionId"] }];

        await queryRunner.createTable(new Table(categoryTableOptions), true);

        let personTable = await queryRunner.getTable("person");
        const personIdColumn = personTable!.findColumnByName("id");
        const personUserIdColumn = personTable!.findColumnByName("id");
        personIdColumn!.isPrimary.should.be.true;
        personUserIdColumn!.isPrimary.should.be.true;
        personTable!.should.exist;

        let questionTable = await queryRunner.getTable("question");
        const questionIdColumn = questionTable!.findColumnByName("id");
        questionIdColumn!.isPrimary.should.be.true;
        questionIdColumn!.isGenerated.should.be.true;
        questionIdColumn!.generationStrategy!.should.be.equal("increment");
        questionTable!.should.exist;

        if (connection.driver instanceof MysqlDriver || connection.driver instanceof SapDriver) {
            // MySql and SAP HANA does not have unique constraints.
            // all unique constraints is unique indexes.
            questionTable!.uniques.length.should.be.equal(0);
            questionTable!.indices.length.should.be.equal(2);

        } else if (connection.driver instanceof CockroachDriver) {
            // CockroachDB stores unique indices as UNIQUE constraints
            questionTable!.uniques.length.should.be.equal(2);
            questionTable!.uniques[0].columnNames.length.should.be.equal(2);
            questionTable!.uniques[1].columnNames.length.should.be.equal(2);
            questionTable!.indices.length.should.be.equal(0);
            questionTable!.checks.length.should.be.equal(1);

        } else {
            questionTable!.uniques.length.should.be.equal(1);
            questionTable!.uniques[0].columnNames.length.should.be.equal(2);
            questionTable!.indices.length.should.be.equal(1);
            questionTable!.indices[0].columnNames.length.should.be.equal(2);
            questionTable!.checks.length.should.be.equal(1);
        }

        questionTable!.foreignKeys.length.should.be.equal(1);
        questionTable!.foreignKeys[0].columnNames.length.should.be.equal(2);
        questionTable!.foreignKeys[0].referencedColumnNames.length.should.be.equal(2);

        let categoryTable = await queryRunner.getTable("category");
        const categoryTableIdColumn = categoryTable!.findColumnByName("id");
        categoryTableIdColumn!.isPrimary.should.be.true;
        categoryTableIdColumn!.isGenerated.should.be.true;
        categoryTableIdColumn!.generationStrategy!.should.be.equal("increment");
        categoryTable!.should.exist;
        categoryTable!.foreignKeys.length.should.be.equal(1);

        if (connection.driver instanceof MysqlDriver || connection.driver instanceof SapDriver) {
            // MySql and SAP HANA does not have unique constraints. All unique constraints is unique indexes.
            categoryTable!.indices.length.should.be.equal(3);

        } else if (connection.driver instanceof OracleDriver) {
            // Oracle does not allow to put index on primary or unique columns.
            categoryTable!.indices.length.should.be.equal(0);

        } else {
            categoryTable!.uniques.length.should.be.equal(3);
            categoryTable!.indices.length.should.be.equal(1);
        }

        await queryRunner.executeMemoryDownSql();

        questionTable = await queryRunner.getTable("question");
        categoryTable = await queryRunner.getTable("category");
        personTable = await queryRunner.getTable("person");
        expect(questionTable).to.be.undefined;
        expect(categoryTable).to.be.undefined;
        expect(personTable).to.be.undefined;

        await queryRunner.release();
    })));

    it("should correctly create table with different `Unique` definitions", () => Promise.all(connections.map(async connection => {

        const queryRunner = connection.createQueryRunner();
        const metadata = connection.getMetadata(Photo);
        const newTable = Table.create(metadata, connection.driver);
        await queryRunner.createTable(newTable);

        let table = await queryRunner.getTable("photo");
        const nameColumn = table!.findColumnByName("name");
        const tagColumn = table!.findColumnByName("tag");
        const descriptionColumn = table!.findColumnByName("description");
        const textColumn = table!.findColumnByName("text");

        table!.should.exist;
        nameColumn!.isUnique.should.be.true;
        descriptionColumn!.isUnique.should.be.true;

        if (connection.driver instanceof MysqlDriver || connection.driver instanceof SapDriver) {
            table!.uniques.length.should.be.equal(0);
            table!.indices.length.should.be.equal(4);
            tagColumn!.isUnique.should.be.true;
            textColumn!.isUnique.should.be.true;

        } else if (connection.driver instanceof CockroachDriver) {
            // CockroachDB stores unique indices as UNIQUE constraints
            table!.uniques.length.should.be.equal(4);
            table!.indices.length.should.be.equal(0);
            tagColumn!.isUnique.should.be.true;
            textColumn!.isUnique.should.be.true;

        } else {
            table!.uniques.length.should.be.equal(2);
            table!.indices.length.should.be.equal(2);
            tagColumn!.isUnique.should.be.false;
            textColumn!.isUnique.should.be.false;
        }

        await queryRunner.executeMemoryDownSql();

        table = await queryRunner.getTable("photo");
        expect(table).to.be.undefined;

        await queryRunner.release();
    })));

    it("should correctly create table with different `withoutRowid` definitions", () => Promise.all(connections.map(async connection => {

        if (connection.driver instanceof AbstractSqliteDriver) {
            const queryRunner = connection.createQueryRunner();

            // the table 'book' must contain a 'rowid' column
            const metadataBook = connection.getMetadata(Book);
            const newTableBook = Table.create(metadataBook, connection.driver);
            await queryRunner.createTable(newTableBook);
            const aBook = new Book();
            aBook.ean = "asdf";
            await connection.manager.save(aBook);

            const desc = await connection.manager.query("SELECT rowid FROM book WHERE ean = 'asdf'");
            expect(desc[0].rowid).equals(1);

            await queryRunner.dropTable("book");
            const bookTableIsGone = await queryRunner.getTable("book");
            expect(bookTableIsGone).to.be.undefined;

            // the table 'book2' must NOT contain a 'rowid' column
            const metadataBook2 = connection.getMetadata(Book2);
            const newTableBook2 = Table.create(metadataBook2, connection.driver);
            await queryRunner.createTable(newTableBook2);

            try {
                await connection.manager.query("SELECT rowid FROM book2");
            } catch (e) {
                expect(e.message).contains("no such column: rowid");
            }

            await queryRunner.dropTable("book2");
            const book2TableIsGone = await queryRunner.getTable("book2");
            expect(book2TableIsGone).to.be.undefined;

            await queryRunner.release();
        }
    })));

});
