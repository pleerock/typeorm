import "reflect-metadata";
import {Post} from "./entity/Post";
import {PostWithOptions} from "./entity/PostWithOptions";
import {Connection} from "../../../../../src/connection/Connection";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../../../utils/test-utils";
import {PostWithoutTypes} from "./entity/PostWithoutTypes";

describe("database schema > column types > postgres", () => {

    let connections: Connection[];
    before(async () => {
        connections = await createTestingConnections({
            entities: [__dirname + "/entity/*{.js,.ts}"],
            enabledDrivers: ["postgres"],
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
        post.integer = 2147483647;
        post.int4 = 2147483647;
        post.int = 2147483647;
        post.smallint = 32767;
        post.int2 = 32767;
        post.bigint = "8223372036854775807";
        post.int8 = "8223372036854775807";
        post.numeric = "50";
        post.decimal = "50";
        post.doublePrecision = 15.357;
        post.float8 = 15.357;
        post.real = 5.5;
        post.float4 = 5.5;
        post.money = "$775,807.07";
        post.char = "A";
        post.character = "A";
        post.varchar = "This is varchar";
        post.characterVarying = "This is character varying";
        post.text = "This is text";
        post.bytea = new Buffer("This is bytea");
        post.date = "2017-06-21";
        post.interval = "1 year 2 months 3 days 4 hours 5 minutes 6 seconds";
        post.time = "15:30:00";
        post.timeWithTimeZone = "15:30:00 PST";
        post.timetz = "15:30:00 PST";
        post.timestamp = new Date();
        post.timestamp.setMilliseconds(0);
        post.timestampWithTimeZone = new Date();
        post.timestampWithTimeZone.setMilliseconds(0);
        post.timestamptz = new Date();
        post.timestamptz.setMilliseconds(0);
        post.boolean = true;
        post.bool = false;
        post.point = "(10,20)";
        post.line = "{1,2,3}";
        post.lseg = "(1,2), (3,4)";
        post.box = "(1,2),(3,4)"; // postgres swaps coordinates in database. This one will be saved like (3,4),(1,2)
        post.path = "((3,1),(2,8),(10,4))";
        post.polygon = "((3,1),(2,8),(10,4))";
        post.circle = "4, 5, 12";
        post.cidr = "192.168.100.128/25";
        post.inet = "192.168.100.128";
        post.macaddr = "08:00:2b:01:02:03";
        post.bit = "1";
        post.varbit = "100";
        post.bitVarying = "00";
        post.uuid = "0e37df36-f698-11e6-8dd4-cb9ced3df976";
        post.json = { id: 1, name: "Post" };
        post.xml = "<book><title>Manual</title><chapter>...</chapter></book>";
        post.array = [1, 2, 3];
        post.simpleArray = ["A", "B", "C"];
        await postRepository.save(post);

        const loadedPost = (await postRepository.findOneById(1))!;
        loadedPost.id.should.be.equal(post.id);
        loadedPost.name.should.be.equal(post.name);
        loadedPost.integer.should.be.equal(post.integer);
        loadedPost.int4.should.be.equal(post.int4);
        loadedPost.int.should.be.equal(post.int);
        loadedPost.smallint.should.be.equal(post.smallint);
        loadedPost.int2.should.be.equal(post.int2);
        loadedPost.bigint.should.be.equal(post.bigint);
        loadedPost.int8.should.be.equal(post.int8);
        loadedPost.numeric.should.be.equal(post.numeric);
        loadedPost.decimal.should.be.equal(post.decimal);
        loadedPost.doublePrecision.should.be.equal(post.doublePrecision);
        loadedPost.float8.should.be.equal(post.float8);
        loadedPost.real.should.be.equal(post.real);
        loadedPost.float4.should.be.equal(post.float4);
        loadedPost.money.should.be.equal(post.money);
        loadedPost.char.should.be.equal(post.char);
        loadedPost.character.should.be.equal(post.character);
        loadedPost.varchar.should.be.equal(post.varchar);
        loadedPost.characterVarying.should.be.equal(post.characterVarying);
        loadedPost.text.should.be.equal(post.text);
        loadedPost.bytea.toString().should.be.equal(post.bytea.toString());
        loadedPost.date.should.be.equal(post.date);
        loadedPost.interval.years.should.be.equal(1);
        loadedPost.interval.months.should.be.equal(2);
        loadedPost.interval.days.should.be.equal(3);
        loadedPost.interval.hours.should.be.equal(4);
        loadedPost.interval.minutes.should.be.equal(5);
        loadedPost.interval.seconds.should.be.equal(6);
        loadedPost.time.should.be.equal(post.time);
        loadedPost.timeWithTimeZone.should.be.equal("15:30:00-08");
        loadedPost.timetz.should.be.equal("15:30:00-08");
        loadedPost.timestamp.valueOf().should.be.equal(post.timestamp.valueOf());
        // loadedPost.timestampWithTimeZone.getTime().should.be.equal(post.timestampWithTimeZone.getTime());
        loadedPost.timestamptz.valueOf().should.be.equal(post.timestamptz.valueOf());
        loadedPost.boolean.should.be.equal(post.boolean);
        loadedPost.bool.should.be.equal(post.bool);
        loadedPost.point.should.be.eql({ x: 10, y: 20 });
        loadedPost.line.should.be.equal(post.line);
        loadedPost.lseg.should.be.equal("[(1,2),(3,4)]");
        // loadedPost.box.should.be.equal(post.box); // postgres swaps coordinates in database. This one will be saved like (3,4),(1,2)
        loadedPost.path.should.be.equal(post.path);
        loadedPost.polygon.should.be.equal(post.polygon);
        loadedPost.circle.should.be.eql({ x: 4, y: 5, radius: 12 });
        loadedPost.cidr.should.be.equal(post.cidr);
        loadedPost.inet.should.be.equal(post.inet);
        loadedPost.macaddr.should.be.equal(post.macaddr);
        loadedPost.bit.should.be.equal(post.bit);
        loadedPost.varbit.should.be.equal(post.varbit);
        loadedPost.bitVarying.should.be.equal(post.bitVarying);
        loadedPost.uuid.should.be.equal(post.uuid);
        loadedPost.json.should.be.eql(post.json);
        loadedPost.xml.should.be.equal(post.xml);
        loadedPost.array[0].should.be.equal(post.array[0]);
        loadedPost.array[1].should.be.equal(post.array[1]);
        loadedPost.array[2].should.be.equal(post.array[2]);
        loadedPost.simpleArray[0].should.be.equal(post.simpleArray[0]);
        loadedPost.simpleArray[1].should.be.equal(post.simpleArray[1]);
        loadedPost.simpleArray[2].should.be.equal(post.simpleArray[2]);

        tableSchema!.findColumnByName("id")!.type.should.be.equal("integer");
        tableSchema!.findColumnByName("name")!.type.should.be.equal("character varying");
        tableSchema!.findColumnByName("integer")!.type.should.be.equal("integer");
        tableSchema!.findColumnByName("int4")!.type.should.be.equal("integer");
        tableSchema!.findColumnByName("int")!.type.should.be.equal("integer");
        tableSchema!.findColumnByName("smallint")!.type.should.be.equal("smallint");
        tableSchema!.findColumnByName("int2")!.type.should.be.equal("smallint");
        tableSchema!.findColumnByName("bigint")!.type.should.be.equal("bigint");
        tableSchema!.findColumnByName("numeric")!.type.should.be.equal("numeric");
        tableSchema!.findColumnByName("decimal")!.type.should.be.equal("numeric");
        tableSchema!.findColumnByName("doublePrecision")!.type.should.be.equal("double precision");
        tableSchema!.findColumnByName("float8")!.type.should.be.equal("double precision");
        tableSchema!.findColumnByName("real")!.type.should.be.equal("real");
        tableSchema!.findColumnByName("float4")!.type.should.be.equal("real");
        tableSchema!.findColumnByName("money")!.type.should.be.equal("money");
        tableSchema!.findColumnByName("char")!.type.should.be.equal("character");
        tableSchema!.findColumnByName("char")!.length!.should.be.equal(1);
        tableSchema!.findColumnByName("character")!.type.should.be.equal("character");
        tableSchema!.findColumnByName("character")!.length!.should.be.equal(1);
        tableSchema!.findColumnByName("varchar")!.type.should.be.equal("character varying");
        tableSchema!.findColumnByName("characterVarying")!.type.should.be.equal("character varying");
        tableSchema!.findColumnByName("text")!.type.should.be.equal("text");
        tableSchema!.findColumnByName("bytea")!.type.should.be.equal("bytea");
        tableSchema!.findColumnByName("date")!.type.should.be.equal("date");
        tableSchema!.findColumnByName("interval")!.type.should.be.equal("interval");
        tableSchema!.findColumnByName("time")!.type.should.be.equal("time without time zone");
        tableSchema!.findColumnByName("timeWithTimeZone")!.type.should.be.equal("time with time zone");
        tableSchema!.findColumnByName("timetz")!.type.should.be.equal("time with time zone");
        tableSchema!.findColumnByName("timestamp")!.type.should.be.equal("timestamp without time zone");
        tableSchema!.findColumnByName("timestampWithTimeZone")!.type.should.be.equal("timestamp with time zone");
        tableSchema!.findColumnByName("timestamptz")!.type.should.be.equal("timestamp with time zone");
        tableSchema!.findColumnByName("boolean")!.type.should.be.equal("boolean");
        tableSchema!.findColumnByName("bool")!.type.should.be.equal("boolean");
        tableSchema!.findColumnByName("point")!.type.should.be.equal("point");
        tableSchema!.findColumnByName("line")!.type.should.be.equal("line");
        tableSchema!.findColumnByName("lseg")!.type.should.be.equal("lseg");
        tableSchema!.findColumnByName("box")!.type.should.be.equal("box");
        tableSchema!.findColumnByName("path")!.type.should.be.equal("path");
        tableSchema!.findColumnByName("polygon")!.type.should.be.equal("polygon");
        tableSchema!.findColumnByName("circle")!.type.should.be.equal("circle");
        tableSchema!.findColumnByName("cidr")!.type.should.be.equal("cidr");
        tableSchema!.findColumnByName("inet")!.type.should.be.equal("inet");
        tableSchema!.findColumnByName("macaddr")!.type.should.be.equal("macaddr");
        tableSchema!.findColumnByName("bit")!.type.should.be.equal("bit");
        tableSchema!.findColumnByName("bit")!.length!.should.be.equal(1);
        tableSchema!.findColumnByName("varbit")!.type.should.be.equal("bit varying");
        tableSchema!.findColumnByName("bitVarying")!.type.should.be.equal("bit varying");
        tableSchema!.findColumnByName("uuid")!.type.should.be.equal("uuid");
        tableSchema!.findColumnByName("xml")!.type.should.be.equal("xml");
        tableSchema!.findColumnByName("json")!.type.should.be.equal("json");
        tableSchema!.findColumnByName("array")!.type.should.be.equal("integer");
        tableSchema!.findColumnByName("array")!.isArray!.should.be.true;
        tableSchema!.findColumnByName("simpleArray")!.type.should.be.equal("text");

    })));

    it("all types should work correctly - persist and hydrate when options are specified on columns", () => Promise.all(connections.map(async connection => {

        const postRepository = connection.getRepository(PostWithOptions);
        const queryRunner = connection.createQueryRunner();
        const tableSchema = await queryRunner.loadTableSchema("post_with_options");
        await queryRunner.release();

        const post = new PostWithOptions();
        post.id = 1;
        post.numeric = "50.00";
        post.decimal = "50.00";
        post.char = "AAA";
        post.character = "AAA";
        post.varchar = "This is varchar";
        post.characterVarying = "This is character varying";
        post.timestamp = new Date();
        post.timestampWithTimeZone = new Date();
        post.time = "15:30:13.278";
        post.timeWithTimeZone = "15:30:13.27801+05";
        await postRepository.save(post);

        const loadedPost = (await postRepository.findOneById(1))!;
        loadedPost.id.should.be.equal(post.id);
        loadedPost.numeric.should.be.equal(post.numeric);
        loadedPost.decimal.should.be.equal(post.decimal);
        loadedPost.char.should.be.equal(post.char);
        loadedPost.character.should.be.equal(post.character);
        loadedPost.varchar.should.be.equal(post.varchar);
        loadedPost.characterVarying.should.be.equal(post.characterVarying);
        loadedPost.timestamp.valueOf().should.be.equal(post.timestamp.valueOf());
        loadedPost.timestampWithTimeZone.valueOf().should.be.equal(post.timestampWithTimeZone.valueOf());
        loadedPost.time.valueOf().should.be.equal(post.time.valueOf());
        loadedPost.timeWithTimeZone.valueOf().should.be.equal(post.timeWithTimeZone.valueOf());

        tableSchema!.findColumnByName("id")!.type.should.be.equal("integer");
        tableSchema!.findColumnByName("numeric")!.type.should.be.equal("numeric");
        tableSchema!.findColumnByName("numeric")!.precision!.should.be.equal(5);
        tableSchema!.findColumnByName("numeric")!.scale!.should.be.equal(2);
        tableSchema!.findColumnByName("decimal")!.type.should.be.equal("numeric");
        tableSchema!.findColumnByName("decimal")!.precision!.should.be.equal(5);
        tableSchema!.findColumnByName("decimal")!.scale!.should.be.equal(2);
        tableSchema!.findColumnByName("char")!.type.should.be.equal("character");
        tableSchema!.findColumnByName("char")!.length!.should.be.equal(3);
        tableSchema!.findColumnByName("character")!.type.should.be.equal("character");
        tableSchema!.findColumnByName("character")!.length!.should.be.equal(3);
        tableSchema!.findColumnByName("varchar")!.type.should.be.equal("character varying");
        tableSchema!.findColumnByName("varchar")!.length!.should.be.equal(30);
        tableSchema!.findColumnByName("characterVarying")!.type.should.be.equal("character varying");
        tableSchema!.findColumnByName("characterVarying")!.length!.should.be.equal(30);
        tableSchema!.findColumnByName("timestamp")!.type.should.be.equal("timestamp without time zone");
        tableSchema!.findColumnByName("timestamp")!.precision!.should.be.equal(3);
        tableSchema!.findColumnByName("timestampWithTimeZone")!.type.should.be.equal("timestamp with time zone");
        tableSchema!.findColumnByName("timestampWithTimeZone")!.precision!.should.be.equal(5);
        tableSchema!.findColumnByName("time")!.type.should.be.equal("time without time zone");
        tableSchema!.findColumnByName("time")!.precision!.should.be.equal(3);
        tableSchema!.findColumnByName("timeWithTimeZone")!.type.should.be.equal("time with time zone");
        tableSchema!.findColumnByName("timeWithTimeZone")!.precision!.should.be.equal(5);

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
        post.datetime = new Date();
        post.datetime.setMilliseconds(0);
        await postRepository.save(post);

        const loadedPost = (await postRepository.findOneById(1))!;
        loadedPost.id.should.be.equal(post.id);
        loadedPost.name.should.be.equal(post.name);
        loadedPost.bit.should.be.equal(post.bit);
        loadedPost.datetime.valueOf().should.be.equal(post.datetime.valueOf());

        tableSchema!.findColumnByName("id")!.type.should.be.equal("integer");
        tableSchema!.findColumnByName("name")!.type.should.be.equal("character varying");
        tableSchema!.findColumnByName("bit")!.type.should.be.equal("boolean");
        tableSchema!.findColumnByName("datetime")!.type.should.be.equal("timestamp without time zone");

    })));

});
