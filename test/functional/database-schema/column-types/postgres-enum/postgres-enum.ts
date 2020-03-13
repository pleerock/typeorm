import "reflect-metadata";
import {Connection} from "../../../../../src/connection/Connection";
import {expect} from "chai";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../../../utils/test-utils";
import {Post} from "./entity/Post";
import {Table, TableColumn} from "../../../../../src";

describe("database schema > column types > postgres-enum", () => {

    let connections: Connection[];
    before(async () => {
        connections = await createTestingConnections({
            entities: [__dirname + "/entity/*{.js,.ts}"],
            enabledDrivers: ["postgres"],
        });
    });
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should create table with ENUM column and save data to it", () => Promise.all(connections.map(async connection => {

        const postRepository = connection.getRepository(Post);
        const queryRunner = connection.createQueryRunner();
        const table = await queryRunner.getTable("post");
        await queryRunner.release();

        const post = new Post();
        post.enum = "A";
        post.simpleEnum = "A";
        post.name = "Post #1";
        await postRepository.save(post);

        const loadedPost = (await postRepository.findOne(1))!;
        loadedPost.enum.should.be.equal(post.enum);
        loadedPost.simpleEnum.should.be.equal(post.simpleEnum);

        table!.findColumnByName("enum")!.type.should.be.equal("enum");
        table!.findColumnByName("simpleEnum")!.type.should.be.equal("enum");
    })));

    it("should create ENUM column and revert creation", () => Promise.all(connections.map(async connection => {

        const queryRunner = connection.createQueryRunner();
        await queryRunner.addColumn("post", new TableColumn({
            name: "newEnum",
            type: "enum",
            enum: ["Apple", "Pineapple"]
        }));

        let table = await queryRunner.getTable("post");
        table!.findColumnByName("newEnum")!.type.should.be.equal("enum");

        await queryRunner.executeMemoryDownSql();

        table = await queryRunner.getTable("post");
        expect(table!.findColumnByName("newEnum")).to.be.undefined;

        await queryRunner.release();
    })));

    it("should drop ENUM column and revert drop", () => Promise.all(connections.map(async connection => {

        const queryRunner = connection.createQueryRunner();
        let table = await queryRunner.getTable("post");
        const enumColumn = table!.findColumnByName("enum")!;

        await queryRunner.dropColumn(table!, enumColumn);
        expect(table!.findColumnByName("enum")).to.be.undefined;

        await queryRunner.executeMemoryDownSql();

        table = await queryRunner.getTable("post");
        table!.findColumnByName("enum")!.type.should.be.equal("enum");

        await queryRunner.release();
    })));

    it("should create table with ENUM column and revert creation", () => Promise.all(connections.map(async connection => {

        const queryRunner = connection.createQueryRunner();
        await queryRunner.createTable(new Table({
            name: "question",
            columns: [
                {
                    name: "enum",
                    type: "enum",
                    enum: ["Apple", "Banana", "Cherry"]
                }
            ]
        }));

        let table = await queryRunner.getTable("question");
        const enumColumn = table!.findColumnByName("enum")!;
        enumColumn.type.should.be.equal("enum");
        enumColumn.enum!.should.be.eql(["Apple", "Banana", "Cherry"]);

        await queryRunner.executeMemoryDownSql();

        table = await queryRunner.getTable("question");
        expect(table).to.be.undefined;

        await queryRunner.release();
    })));

    it("should drop table with ENUM column and revert drop", () => Promise.all(connections.map(async connection => {

        const queryRunner = connection.createQueryRunner();
        await queryRunner.dropTable("post");

        let table = await queryRunner.getTable("post");
        expect(table).to.be.undefined;

        await queryRunner.executeMemoryDownSql();

        table = await queryRunner.getTable("post");
        expect(table).to.be.not.undefined;

        await queryRunner.release();
    })));

    it("should change non-enum column in to ENUM and revert change", () => Promise.all(connections.map(async connection => {

        const queryRunner = connection.createQueryRunner();
        let table = await queryRunner.getTable("post");
        let nameColumn = table!.findColumnByName("name")!;
        let changedColumn = nameColumn.clone();
        changedColumn.type = "enum";
        changedColumn.enum = ["Apple", "Banana", "Cherry"];

        await queryRunner.changeColumn(table!, nameColumn, changedColumn);

        table = await queryRunner.getTable("post");
        changedColumn = table!.findColumnByName("name")!;
        changedColumn.type.should.be.equal("enum");
        changedColumn.enum!.should.be.eql(["Apple", "Banana", "Cherry"]);

        await queryRunner.executeMemoryDownSql();

        table = await queryRunner.getTable("post");
        nameColumn = table!.findColumnByName("name")!;
        nameColumn.type.should.be.equal("character varying");
        expect(nameColumn.enum).to.be.undefined;

        await queryRunner.release();
    })));

    it("should change ENUM column in to non-enum and revert change", () => Promise.all(connections.map(async connection => {

        const queryRunner = connection.createQueryRunner();
        let table = await queryRunner.getTable("post");
        let enumColumn = table!.findColumnByName("enum")!;
        let changedColumn = enumColumn.clone();
        changedColumn.type = "character varying";
        changedColumn.enum = undefined;

        await queryRunner.changeColumn(table!, enumColumn, changedColumn);

        table = await queryRunner.getTable("post");
        changedColumn = table!.findColumnByName("enum")!;
        changedColumn.type.should.be.equal("character varying");
        expect(changedColumn.enum).to.be.undefined;

        await queryRunner.executeMemoryDownSql();

        table = await queryRunner.getTable("post");
        enumColumn = table!.findColumnByName("enum")!;
        enumColumn.type.should.be.equal("enum");
        enumColumn.enum!.should.be.eql(["A", "B", "C"]);

        await queryRunner.release();
    })));

    it("should change ENUM column and revert change", () => Promise.all(connections.map(async connection => {

        const queryRunner = connection.createQueryRunner();
        let table = await queryRunner.getTable("post");
        const enumColumn = table!.findColumnByName("enum")!;
        const changedColumn = enumColumn.clone();
        changedColumn.enum = ["C", "D", "E"];

        await queryRunner.changeColumn(table!, enumColumn, changedColumn);

        table = await queryRunner.getTable("post");
        table!.findColumnByName("enum")!.enum!.should.be.eql(["C", "D", "E"]);

        await queryRunner.executeMemoryDownSql();

        table = await queryRunner.getTable("post");
        table!.findColumnByName("enum")!.enum!.should.be.eql(["A", "B", "C"]);

        await queryRunner.release();
    })));

    it("should rename ENUM when column renamed and revert rename", () => Promise.all(connections.map(async connection => {

        const queryRunner = connection.createQueryRunner();
        const table = await queryRunner.getTable("post");
        const enumColumn = table!.findColumnByName("enum")!;
        const changedColumn = enumColumn.clone();
        changedColumn.name = "enumerable";

        await queryRunner.changeColumn(table!, enumColumn, changedColumn);

        let result = await queryRunner.query(`SELECT "n"."nspname", "t"."typname" FROM "pg_type" "t" ` +
            `INNER JOIN "pg_namespace" "n" ON "n"."oid" = "t"."typnamespace" ` +
            `WHERE "n"."nspname" = current_schema() AND "t"."typname" = 'post_enumerable_enum'`);
        result.length.should.be.equal(1);

        await queryRunner.executeMemoryDownSql();

        result = await queryRunner.query(`SELECT "n"."nspname", "t"."typname" FROM "pg_type" "t" ` +
            `INNER JOIN "pg_namespace" "n" ON "n"."oid" = "t"."typnamespace" ` +
            `WHERE "n"."nspname" = current_schema() AND "t"."typname" = 'post_enum_enum'`);
        result.length.should.be.equal(1);

        await queryRunner.release();
    })));

    it("should rename ENUM when table renamed and revert rename", () => Promise.all(connections.map(async connection => {

        const queryRunner = connection.createQueryRunner();
        const table = await queryRunner.getTable("post");

        await queryRunner.renameTable(table!, "question");

        let result = await queryRunner.query(`SELECT "n"."nspname", "t"."typname" FROM "pg_type" "t" ` +
            `INNER JOIN "pg_namespace" "n" ON "n"."oid" = "t"."typnamespace" ` +
            `WHERE "n"."nspname" = current_schema() AND "t"."typname" = 'question_enum_enum'`);
        result.length.should.be.equal(1);

        await queryRunner.executeMemoryDownSql();

        result = await queryRunner.query(`SELECT "n"."nspname", "t"."typname" FROM "pg_type" "t" ` +
            `INNER JOIN "pg_namespace" "n" ON "n"."oid" = "t"."typnamespace" ` +
            `WHERE "n"."nspname" = current_schema() AND "t"."typname" = 'post_enum_enum'`);
        result.length.should.be.equal(1);

        await queryRunner.release();
    })));

});
