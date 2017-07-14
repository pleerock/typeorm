import "reflect-metadata";
import {Post} from "./entity/Post";
import {Connection} from "../../../../../src/connection/Connection";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../../../utils/test-utils";
import {PostWithOptions} from "./entity/PostWithOptions";
import {PostWithoutTypes} from "./entity/PostWithoutTypes";
import {DateUtils} from "../../../../../src/util/DateUtils";

describe("database schema > column types > mssql", () => {

    let connections: Connection[];
    before(async () => {
        connections = await createTestingConnections({
            entities: [__dirname + "/entity/*{.js,.ts}"],
            enabledDrivers: ["mssql"],
            schemaCreate: true,
            dropSchemaOnConnection: true,
        });
    });
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("all types should work correctly - persist and hydrate", () => Promise.all(connections.map(async connection => {

        const postRepository = connection.getRepository(Post);
        const queryRunner = connection.createQueryRunner();
        const tableSchema = await queryRunner.loadTableSchema("post");
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
        post.simpleArray = ["A", "B", "C"];
        await postRepository.save(post);

        const loadedPost = (await postRepository.findOneById(1))!;
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
        loadedPost.char.should.be.equal(post.char);
        loadedPost.varchar.should.be.equal(post.varchar);
        loadedPost.text.should.be.equal(post.text);
        loadedPost.nchar.should.be.equal(post.nchar);
        loadedPost.nvarchar.should.be.equal(post.nvarchar);
        loadedPost.ntext.should.be.equal(post.ntext);
        loadedPost.binary.toString().should.be.equal(post.binary.toString());
        loadedPost.varbinary.toString().should.be.equal(post.varbinary.toString());
        loadedPost.image.toString().should.be.equal(post.image.toString());
        loadedPost.dateObj.should.be.equal(DateUtils.mixedDateToDateString(post.dateObj));
        loadedPost.date.should.be.equal(post.date);
        loadedPost.datetime.getTime().should.be.equal(post.datetime.getTime());
        loadedPost.datetime2.getTime().should.be.equal(post.datetime2.getTime());
        loadedPost.smalldatetime.getTime().should.be.equal(post.smalldatetime.getTime());
        loadedPost.timeObj.should.be.equal(DateUtils.mixedTimeToString(post.timeObj));
        loadedPost.time.should.be.equal(post.time);
        loadedPost.datetimeoffset.getTime().should.be.equal(post.datetimeoffset.getTime());
        loadedPost.simpleArray[0].should.be.equal(post.simpleArray[0]);
        loadedPost.simpleArray[1].should.be.equal(post.simpleArray[1]);
        loadedPost.simpleArray[2].should.be.equal(post.simpleArray[2]);

        tableSchema!.findColumnByName("id")!.type.should.be.equal("int");
        tableSchema!.findColumnByName("name")!.type.should.be.equal("nvarchar");
        tableSchema!.findColumnByName("name")!.length!.should.be.equal(255);
        tableSchema!.findColumnByName("bit")!.type.should.be.equal("bit");
        tableSchema!.findColumnByName("tinyint")!.type.should.be.equal("tinyint");
        tableSchema!.findColumnByName("smallint")!.type.should.be.equal("smallint");
        tableSchema!.findColumnByName("int")!.type.should.be.equal("int");
        tableSchema!.findColumnByName("bigint")!.type.should.be.equal("bigint");
        tableSchema!.findColumnByName("decimal")!.type.should.be.equal("decimal");
        tableSchema!.findColumnByName("dec")!.type.should.be.equal("decimal");
        tableSchema!.findColumnByName("numeric")!.type.should.be.equal("numeric");
        tableSchema!.findColumnByName("float")!.type.should.be.equal("float");
        tableSchema!.findColumnByName("real")!.type.should.be.equal("real");
        tableSchema!.findColumnByName("smallmoney")!.type.should.be.equal("smallmoney");
        tableSchema!.findColumnByName("money")!.type.should.be.equal("money");
        tableSchema!.findColumnByName("char")!.type.should.be.equal("char");
        tableSchema!.findColumnByName("char")!.length!.should.be.equal(1);
        tableSchema!.findColumnByName("varchar")!.type.should.be.equal("varchar");
        tableSchema!.findColumnByName("varchar")!.length!.should.be.equal(255);
        tableSchema!.findColumnByName("text")!.type.should.be.equal("text");
        tableSchema!.findColumnByName("nchar")!.type.should.be.equal("nchar");
        tableSchema!.findColumnByName("nchar")!.length!.should.be.equal(1);
        tableSchema!.findColumnByName("nvarchar")!.type.should.be.equal("nvarchar");
        tableSchema!.findColumnByName("nvarchar")!.length!.should.be.equal(255);
        tableSchema!.findColumnByName("ntext")!.type.should.be.equal("ntext");
        tableSchema!.findColumnByName("binary")!.type.should.be.equal("binary");
        tableSchema!.findColumnByName("binary")!.length!.should.be.equal(1);
        tableSchema!.findColumnByName("varbinary")!.type.should.be.equal("varbinary");
        tableSchema!.findColumnByName("varbinary")!.length!.should.be.equal(1);
        tableSchema!.findColumnByName("image")!.type.should.be.equal("image");
        tableSchema!.findColumnByName("date")!.type.should.be.equal("date");
        tableSchema!.findColumnByName("dateObj")!.type.should.be.equal("date");
        tableSchema!.findColumnByName("datetime")!.type.should.be.equal("datetime");
        tableSchema!.findColumnByName("datetime2")!.type.should.be.equal("datetime2");
        tableSchema!.findColumnByName("smalldatetime")!.type.should.be.equal("smalldatetime");
        tableSchema!.findColumnByName("time")!.type.should.be.equal("time");
        tableSchema!.findColumnByName("timeObj")!.type.should.be.equal("time");
        tableSchema!.findColumnByName("datetimeoffset")!.type.should.be.equal("datetimeoffset");
        tableSchema!.findColumnByName("simpleArray")!.type.should.be.equal("ntext");

    })));

    it("all types should work correctly - persist and hydrate when options are specified on columns", () => Promise.all(connections.map(async connection => {

        const postRepository = connection.getRepository(PostWithOptions);
        const queryRunner = connection.createQueryRunner();
        const tableSchema = await queryRunner.loadTableSchema("post_with_options");
        await queryRunner.release();

        const post = new PostWithOptions();
        post.id = 1;
        post.decimal = 50;
        post.dec = 60;
        post.numeric = 70;
        post.float = 5.25;
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

        const loadedPost = (await postRepository.findOneById(1))!;
        loadedPost.id.should.be.equal(post.id);
        loadedPost.char.should.be.equal(post.char);
        loadedPost.varchar.should.be.equal(post.varchar);
        loadedPost.nchar.should.be.equal(post.nchar);
        loadedPost.nvarchar.should.be.equal(post.nvarchar);
        loadedPost.decimal.should.be.equal(post.decimal);
        loadedPost.dec.should.be.equal(post.dec);
        loadedPost.numeric.should.be.equal(post.numeric);
        loadedPost.float.should.be.equal(post.float);
        loadedPost.char.should.be.equal(post.char);
        loadedPost.varchar.should.be.equal(post.varchar);
        loadedPost.nchar.should.be.equal(post.nchar);
        loadedPost.nvarchar.should.be.equal(post.nvarchar);
        loadedPost.binary.toString().should.be.equal(post.binary.toString());
        loadedPost.varbinary.toString().should.be.equal(post.varbinary.toString());
        loadedPost.datetime2.getTime().should.be.equal(post.datetime2.getTime());
        loadedPost.time.should.be.equal(DateUtils.mixedTimeToString(post.time));
        loadedPost.datetimeoffset.getTime().should.be.equal(post.datetimeoffset.getTime());

        tableSchema!.findColumnByName("id")!.type.should.be.equal("int");
        tableSchema!.findColumnByName("decimal")!.type.should.be.equal("decimal");
        tableSchema!.findColumnByName("decimal")!.precision!.should.be.equal(10);
        tableSchema!.findColumnByName("decimal")!.scale!.should.be.equal(5);
        tableSchema!.findColumnByName("dec")!.type.should.be.equal("decimal");
        tableSchema!.findColumnByName("dec")!.precision!.should.be.equal(10);
        tableSchema!.findColumnByName("dec")!.scale!.should.be.equal(5);
        tableSchema!.findColumnByName("numeric")!.type.should.be.equal("numeric");
        tableSchema!.findColumnByName("numeric")!.precision!.should.be.equal(10);
        tableSchema!.findColumnByName("numeric")!.scale!.should.be.equal(5);
        tableSchema!.findColumnByName("float")!.type.should.be.equal("real");
        tableSchema!.findColumnByName("float")!.precision!.should.be.equal(24);
        tableSchema!.findColumnByName("char")!.type.should.be.equal("char");
        tableSchema!.findColumnByName("char")!.length!.should.be.equal(3);
        tableSchema!.findColumnByName("varchar")!.type.should.be.equal("varchar");
        tableSchema!.findColumnByName("varchar")!.length!.should.be.equal(50);
        tableSchema!.findColumnByName("nchar")!.type.should.be.equal("nchar");
        tableSchema!.findColumnByName("nchar")!.length!.should.be.equal(3);
        tableSchema!.findColumnByName("nvarchar")!.type.should.be.equal("nvarchar");
        tableSchema!.findColumnByName("nvarchar")!.length!.should.be.equal(40);
        tableSchema!.findColumnByName("binary")!.type.should.be.equal("binary");
        tableSchema!.findColumnByName("binary")!.length!.should.be.equal(5);
        tableSchema!.findColumnByName("varbinary")!.type.should.be.equal("varbinary");
        tableSchema!.findColumnByName("varbinary")!.length!.should.be.equal(5);
        tableSchema!.findColumnByName("datetime2")!.type.should.be.equal("datetime2");
        tableSchema!.findColumnByName("datetime2")!.precision!.should.be.equal(5);
        tableSchema!.findColumnByName("time")!.type.should.be.equal("time");
        tableSchema!.findColumnByName("time")!.precision!.should.be.equal(6);
        tableSchema!.findColumnByName("datetimeoffset")!.type.should.be.equal("datetimeoffset");
        tableSchema!.findColumnByName("datetimeoffset")!.precision!.should.be.equal(7);

    })));

    it("all types should work correctly - persist and hydrate when types are not specified on columns", () => Promise.all(connections.map(async connection => {

        const postRepository = connection.getRepository(PostWithoutTypes);
        const queryRunner = connection.createQueryRunner();
        const tableSchema = await queryRunner.loadTableSchema("post_without_types");
        await queryRunner.release();

        const post = new PostWithoutTypes();
        post.id = 1;
        post.name = "Post";
        post.bit = true;
        post.binary = new Buffer("A");
        post.datetime = new Date();
        post.datetime.setMilliseconds(0); // set milliseconds to zero because the SQL Server datetime type only has a 1/300 ms (~3.33̅ ms) resolution
        await postRepository.save(post);

        const loadedPost = (await postRepository.findOneById(1))!;
        loadedPost.id.should.be.equal(post.id);
        loadedPost.name.should.be.equal(post.name);
        loadedPost.bit.should.be.equal(post.bit);
        loadedPost.binary.toString().should.be.equal(post.binary.toString());
        loadedPost.datetime.getTime().should.be.equal(post.datetime.getTime());

        tableSchema!.findColumnByName("id")!.type.should.be.equal("int");
        tableSchema!.findColumnByName("name")!.type.should.be.equal("nvarchar");
        tableSchema!.findColumnByName("name")!.length!.should.be.equal(255);
        tableSchema!.findColumnByName("bit")!.type.should.be.equal("bit");
        tableSchema!.findColumnByName("binary")!.type.should.be.equal("binary");
        tableSchema!.findColumnByName("binary")!.length!.should.be.equal(1);
        tableSchema!.findColumnByName("datetime")!.type.should.be.equal("datetime");

    })));

});
