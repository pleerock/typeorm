import "reflect-metadata";
import {Post} from "./entity/Post";
import {Connection} from "../../../../../src/connection/Connection";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../../../utils/test-utils";
import {PostWithOptions} from "./entity/PostWithOptions";
import {PostWithoutTypes} from "./entity/PostWithoutTypes";
import {DateUtils} from "../../../../../src/util/DateUtils";
import {FruitEnum} from "./enum/FruitEnum";

describe("database schema > column types > mssql", () => { // https://github.com/tediousjs/tedious/issues/722

    let connections: Connection[];
    before(async () => {
        connections = await createTestingConnections({
            entities: [__dirname + "/entity/*{.js,.ts}"],
            enabledDrivers: ["mssql"],
        });
    });
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("all types should work correctly - persist and hydrate", () => Promise.all(connections.map(async connection => {

        const postRepository = connection.getRepository(Post);
        const queryRunner = connection.createQueryRunner();
        const table = await queryRunner.getTable("post");
        await queryRunner.release();

        const post = new Post();
        post.id = 1;
        post.name = "Post";
        post.bit = true;
        post.tinyint = 127;
        post.smallint = 32767;
        post.int = 2147483647;
        post.bigint = "9007199254740991";
        post.decimal = 50;
        post.dec = 100;
        post.numeric = 10;
        post.float = 10.53;
        post.real = 10.5;
        post.smallmoney = 100;
        post.money = 2500;
        post.uniqueidentifier = "FD357B8F-8838-42F6-B7A2-AE027444E895";
        post.char = "A";
        post.varchar = "This is varchar";
        post.text = "This is text";
        post.nchar = "A";
        post.nvarchar = "This is nvarchar";
        post.ntext = "This is ntext";
        post.binary = new Buffer("A");
        post.varbinary = new Buffer("B");
        post.image = new Buffer("This is image");
        post.dateObj = new Date();
        post.date = "2017-06-21";
        post.datetime = new Date();
        post.datetime.setMilliseconds(0); // set milliseconds to zero because the SQL Server datetime type only has a 1/300 ms (~3.33̅ ms) resolution
        post.datetime2 = new Date();
        post.smalldatetime = new Date();
        post.smalldatetime.setSeconds(0); // set seconds to zero because smalldatetime type rounds seconds
        post.smalldatetime.setMilliseconds(0); // set milliseconds to zero because smalldatetime type does not stores milliseconds
        post.timeObj = new Date();
        post.time = "15:30:00";
        post.datetimeoffset = new Date();
        post.geometry1 = "LINESTRING (100 100, 20 180, 180 180)";
        post.geometry2 = "POLYGON ((0 0, 150 0, 150 150, 0 150, 0 0))";
        post.geometry3 = "GEOMETRYCOLLECTION (POINT (4 0), LINESTRING (4 2, 5 3), POLYGON ((0 0, 3 0, 3 3, 0 3, 0 0), (1 1, 1 2, 2 2, 2 1, 1 1)))";
        post.simpleArray = ["A", "B", "C"];
        post.simpleJson = { param: "VALUE" };
        post.simpleEnum = "A";
        post.simpleClassEnum1 = FruitEnum.Apple;
        await postRepository.save(post);

        const loadedPost = (await postRepository.findOne(1))!;
        loadedPost.id.should.be.equal(post.id);
        loadedPost.name.should.be.equal(post.name);
        loadedPost.bit.should.be.equal(post.bit);
        loadedPost.smallint.should.be.equal(post.smallint);
        loadedPost.tinyint.should.be.equal(post.tinyint);
        loadedPost.int.should.be.equal(post.int);
        loadedPost.bigint.should.be.equal(post.bigint);
        loadedPost.decimal.should.be.equal(post.decimal);
        loadedPost.dec.should.be.equal(post.dec);
        loadedPost.numeric.should.be.equal(post.numeric);
        loadedPost.float.should.be.equal(post.float);
        loadedPost.real.should.be.equal(post.real);
        loadedPost.smallmoney.should.be.equal(post.smallmoney);
        loadedPost.money.should.be.equal(post.money);
        loadedPost.uniqueidentifier.should.be.equal(post.uniqueidentifier);
        loadedPost.char.should.be.equal(post.char);
        loadedPost.varchar.should.be.equal(post.varchar);
        loadedPost.text.should.be.equal(post.text);
        loadedPost.nchar.should.be.equal(post.nchar);
        loadedPost.nvarchar.should.be.equal(post.nvarchar);
        loadedPost.ntext.should.be.equal(post.ntext);
        loadedPost.binary.toString().should.be.equal(post.binary.toString());
        loadedPost.varbinary.toString().should.be.equal(post.varbinary.toString());
        loadedPost.image.toString().should.be.equal(post.image.toString());
        loadedPost.rowversion.should.not.be.null;
        loadedPost.rowversion.should.not.be.undefined;
        loadedPost.dateObj.should.be.equal(DateUtils.mixedDateToDateString(post.dateObj));
        loadedPost.date.should.be.equal(post.date);
        // commented because mssql inserted milliseconds are not always equal to what we say it to insert
        // commented to prevent CI failings
        // loadedPost.datetime.getTime().should.be.equal(post.datetime.getTime());
        // loadedPost.datetime2.getTime().should.be.equal(post.datetime2.getTime());
        // loadedPost.datetimeoffset.getTime().should.be.equal(post.datetimeoffset.getTime());

        // mssql driver is sending an object when updating entity on save (returning)
        // and a plain string when doing a SELECT
        // hence the replacement with strings
        loadedPost.geometry1.should.be.equal("LINESTRING (100 100, 20 180, 180 180)");
        loadedPost.geometry2.should.be.equal("POLYGON ((0 0, 150 0, 150 150, 0 150, 0 0))");
        loadedPost.geometry3.should.be.equal("GEOMETRYCOLLECTION (POINT (4 0), LINESTRING (4 2, 5 3), POLYGON ((0 0, 3 0, 3 3, 0 3, 0 0), (1 1, 1 2, 2 2, 2 1, 1 1)))");
        loadedPost.smalldatetime.getTime().should.be.equal(post.smalldatetime.getTime());
        loadedPost.timeObj.should.be.equal(DateUtils.mixedTimeToString(post.timeObj));
        loadedPost.time.should.be.equal(post.time);
        loadedPost.simpleArray[0].should.be.equal(post.simpleArray[0]);
        loadedPost.simpleArray[1].should.be.equal(post.simpleArray[1]);
        loadedPost.simpleArray[2].should.be.equal(post.simpleArray[2]);
        loadedPost.simpleJson.param.should.be.equal(post.simpleJson.param);
        loadedPost.simpleEnum.should.be.equal(post.simpleEnum);
        loadedPost.simpleClassEnum1.should.be.equal(post.simpleClassEnum1);

        table!.findColumnByName("id")!.type.should.be.equal("int");
        table!.findColumnByName("name")!.type.should.be.equal("nvarchar");
        table!.findColumnByName("bit")!.type.should.be.equal("bit");
        table!.findColumnByName("tinyint")!.type.should.be.equal("tinyint");
        table!.findColumnByName("smallint")!.type.should.be.equal("smallint");
        table!.findColumnByName("int")!.type.should.be.equal("int");
        table!.findColumnByName("bigint")!.type.should.be.equal("bigint");
        table!.findColumnByName("decimal")!.type.should.be.equal("decimal");
        table!.findColumnByName("dec")!.type.should.be.equal("decimal");
        table!.findColumnByName("numeric")!.type.should.be.equal("numeric");
        table!.findColumnByName("float")!.type.should.be.equal("float");
        table!.findColumnByName("real")!.type.should.be.equal("real");
        table!.findColumnByName("smallmoney")!.type.should.be.equal("smallmoney");
        table!.findColumnByName("money")!.type.should.be.equal("money");
        table!.findColumnByName("uniqueidentifier")!.type.should.be.equal("uniqueidentifier");
        table!.findColumnByName("char")!.type.should.be.equal("char");
        table!.findColumnByName("varchar")!.type.should.be.equal("varchar");
        table!.findColumnByName("text")!.type.should.be.equal("text");
        table!.findColumnByName("nchar")!.type.should.be.equal("nchar");
        table!.findColumnByName("nvarchar")!.type.should.be.equal("nvarchar");
        table!.findColumnByName("ntext")!.type.should.be.equal("ntext");
        table!.findColumnByName("binary")!.type.should.be.equal("binary");
        table!.findColumnByName("varbinary")!.type.should.be.equal("varbinary");
        table!.findColumnByName("image")!.type.should.be.equal("image");
        // the rowversion type's name in SQL server metadata is timestamp
        table!.findColumnByName("rowversion")!.type.should.be.equal("timestamp");
        table!.findColumnByName("date")!.type.should.be.equal("date");
        table!.findColumnByName("dateObj")!.type.should.be.equal("date");
        table!.findColumnByName("datetime")!.type.should.be.equal("datetime");
        table!.findColumnByName("datetime2")!.type.should.be.equal("datetime2");
        table!.findColumnByName("smalldatetime")!.type.should.be.equal("smalldatetime");
        table!.findColumnByName("time")!.type.should.be.equal("time");
        table!.findColumnByName("timeObj")!.type.should.be.equal("time");
        table!.findColumnByName("datetimeoffset")!.type.should.be.equal("datetimeoffset");
        table!.findColumnByName("geometry1")!.type.should.be.equal("geometry");
        table!.findColumnByName("simpleArray")!.type.should.be.equal("ntext");
        table!.findColumnByName("simpleJson")!.type.should.be.equal("ntext");
        table!.findColumnByName("simpleEnum")!.type.should.be.equal("simple-enum");
        table!.findColumnByName("simpleEnum")!.enum![0].should.be.equal("A");
        table!.findColumnByName("simpleEnum")!.enum![1].should.be.equal("B");
        table!.findColumnByName("simpleEnum")!.enum![2].should.be.equal("C");
        table!.findColumnByName("simpleClassEnum1")!.type.should.be.equal("simple-enum");
        table!.findColumnByName("simpleClassEnum1")!.enum![0].should.be.equal("apple");
        table!.findColumnByName("simpleClassEnum1")!.enum![1].should.be.equal("pineapple");
        table!.findColumnByName("simpleClassEnum1")!.enum![2].should.be.equal("banana");

    })));

    it("all types should work correctly - persist and hydrate when options are specified on columns", () => Promise.all(connections.map(async connection => {

        const postRepository = connection.getRepository(PostWithOptions);
        const queryRunner = connection.createQueryRunner();
        const table = await queryRunner.getTable("post_with_options");
        await queryRunner.release();

        const post = new PostWithOptions();
        post.id = 1;
        post.decimal = 50;
        post.dec = 60;
        post.numeric = 70;
        post.char = "AAA";
        post.varchar = "This is varchar";
        post.nchar = "AAA";
        post.nvarchar = "This is nvarchar";
        post.binary = new Buffer("AAAAA");
        post.varbinary = new Buffer("BBBBB");
        post.datetime2 = new Date();
        post.time = new Date();
        post.datetimeoffset = new Date();
        await postRepository.save(post);

        const loadedPost = (await postRepository.findOne(1))!;
        loadedPost.id.should.be.equal(post.id);
        loadedPost.char.should.be.equal(post.char);
        loadedPost.varchar.should.be.equal(post.varchar);
        loadedPost.nchar.should.be.equal(post.nchar);
        loadedPost.nvarchar.should.be.equal(post.nvarchar);
        loadedPost.decimal.should.be.equal(post.decimal);
        loadedPost.dec.should.be.equal(post.dec);
        loadedPost.numeric.should.be.equal(post.numeric);
        loadedPost.char.should.be.equal(post.char);
        loadedPost.varchar.should.be.equal(post.varchar);
        loadedPost.nchar.should.be.equal(post.nchar);
        loadedPost.nvarchar.should.be.equal(post.nvarchar);
        loadedPost.binary.toString().should.be.equal(post.binary.toString());
        loadedPost.varbinary.toString().should.be.equal(post.varbinary.toString());
        // commented because mssql inserted milliseconds are not always equal to what we say it to insert
        // commented to prevent CI failings
        // loadedPost.datetime2.getTime().should.be.equal(post.datetime2.getTime());
        // loadedPost.datetimeoffset.getTime().should.be.equal(post.datetimeoffset.getTime());
        loadedPost.time.should.be.equal(DateUtils.mixedTimeToString(post.time));

        table!.findColumnByName("id")!.type.should.be.equal("int");
        table!.findColumnByName("decimal")!.type.should.be.equal("decimal");
        table!.findColumnByName("decimal")!.precision!.should.be.equal(10);
        table!.findColumnByName("decimal")!.scale!.should.be.equal(5);
        table!.findColumnByName("dec")!.type.should.be.equal("decimal");
        table!.findColumnByName("dec")!.precision!.should.be.equal(10);
        table!.findColumnByName("dec")!.scale!.should.be.equal(5);
        table!.findColumnByName("numeric")!.type.should.be.equal("numeric");
        table!.findColumnByName("numeric")!.precision!.should.be.equal(10);
        table!.findColumnByName("numeric")!.scale!.should.be.equal(5);
        table!.findColumnByName("char")!.type.should.be.equal("char");
        table!.findColumnByName("char")!.length!.should.be.equal("3");
        table!.findColumnByName("varchar")!.type.should.be.equal("varchar");
        table!.findColumnByName("varchar")!.length!.should.be.equal("50");
        table!.findColumnByName("nchar")!.type.should.be.equal("nchar");
        table!.findColumnByName("nchar")!.length!.should.be.equal("3");
        table!.findColumnByName("nvarchar")!.type.should.be.equal("nvarchar");
        table!.findColumnByName("nvarchar")!.length!.should.be.equal("40");
        table!.findColumnByName("binary")!.type.should.be.equal("binary");
        table!.findColumnByName("binary")!.length!.should.be.equal("5");
        table!.findColumnByName("varbinary")!.type.should.be.equal("varbinary");
        table!.findColumnByName("varbinary")!.length!.should.be.equal("5");
        table!.findColumnByName("datetime2")!.type.should.be.equal("datetime2");
        table!.findColumnByName("datetime2")!.precision!.should.be.equal(4);
        table!.findColumnByName("time")!.type.should.be.equal("time");
        table!.findColumnByName("time")!.precision!.should.be.equal(5);
        table!.findColumnByName("datetimeoffset")!.type.should.be.equal("datetimeoffset");
        table!.findColumnByName("datetimeoffset")!.precision!.should.be.equal(6);

    })));

    it("all types should work correctly - persist and hydrate when types are not specified on columns", () => Promise.all(connections.map(async connection => {

        const postRepository = connection.getRepository(PostWithoutTypes);
        const queryRunner = connection.createQueryRunner();
        const table = await queryRunner.getTable("post_without_types");
        await queryRunner.release();

        const post = new PostWithoutTypes();
        post.id = 1;
        post.name = "Post";
        post.bit = true;
        post.binary = new Buffer("A");
        post.datetime = new Date();
        post.datetime.setMilliseconds(0); // set milliseconds to zero because the SQL Server datetime type only has a 1/300 ms (~3.33̅ ms) resolution
        await postRepository.save(post);

        const loadedPost = (await postRepository.findOne(1))!;
        loadedPost.id.should.be.equal(post.id);
        loadedPost.name.should.be.equal(post.name);
        loadedPost.bit.should.be.equal(post.bit);
        loadedPost.binary.toString().should.be.equal(post.binary.toString());
        loadedPost.datetime.getTime().should.be.equal(post.datetime.getTime());

        table!.findColumnByName("id")!.type.should.be.equal("int");
        table!.findColumnByName("name")!.type.should.be.equal("nvarchar");
        table!.findColumnByName("bit")!.type.should.be.equal("bit");
        table!.findColumnByName("binary")!.type.should.be.equal("binary");
        table!.findColumnByName("datetime")!.type.should.be.equal("datetime");

    })));

});
