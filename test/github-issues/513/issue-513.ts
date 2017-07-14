import "reflect-metadata";
import {createTestingConnections, closeTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Connection} from "../../../src/connection/Connection";
import {ObjectLiteral} from "../../../src/common/ObjectLiteral";
import {expect} from "chai";
import {Post} from "./entity/Post";
import {DateUtils} from "../../../src/util/DateUtils";

describe("github issues > #513 Incorrect time/datetime types for SQLite", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        schemaCreate: true,
        dropSchemaOnConnection: true,
        enabledDrivers: ["sqlite"]
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should create datetime column type for datetime in sqlite", () => Promise.all(connections.map(async connection => {
      const dbColumns: ObjectLiteral[] = await connection.entityManager.query("PRAGMA table_info(Post)");
      expect(dbColumns).not.to.be.null;
      expect(dbColumns).not.to.be.empty;

      let columnType: string = "";
      dbColumns.map((dbColumn) => {
        if (dbColumn["name"] === "dateTimeColumn") {
          columnType = dbColumn["type"];
        }        
      });

      // Expect "datetime" type to translate to SQLite affinity type "DATETIME"
      columnType.should.equal("datetime");
    })));
    
    it("should persist correct type in datetime column in sqlite", () => Promise.all(connections.map(async connection => {
      const now: Date = new Date();

      const post: Post = new Post();
      post.id = 1;
      post.dateTimeColumn = now;
      
      await connection.entityManager.persist(post);

      const storedPost = await connection.entityManager.findOneById(Post, post.id);
      expect(storedPost).to.not.be.null;
      storedPost!.dateTimeColumn.toDateString().should.equal(now.toDateString());
    })));

    it("should create datetime column type for time in sqlite", () => Promise.all(connections.map(async connection => {
      const dbColumns: ObjectLiteral[] = await connection.entityManager.query("PRAGMA table_info(Post)");
      expect(dbColumns).not.to.be.null;
      expect(dbColumns).not.to.be.empty;

      let columnType: string = "";
      dbColumns.map((dbColumn) => {
        if (dbColumn["name"] === "timeColumn") {
          columnType = dbColumn["type"];
        }        
      });

      // Expect "time" type to translate to SQLite type "TEXT"
      columnType.should.equal("time");
    })));

    it("should persist correct type in datetime column in sqlite", () => Promise.all(connections.map(async connection => {
      const now: Date = new Date();

      const post: Post = new Post();
      post.id = 2;
      post.timeColumn = now; // Should maybe use Date type?
      
      await connection.entityManager.persist(post);

      const storedPost = await connection.entityManager.findOneById(Post, post.id);
      expect(storedPost).to.not.be.null;

        const expectedTimeString = DateUtils.mixedTimeToString(now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds());
      storedPost!.timeColumn.toString().should.equal(expectedTimeString);
    })));

});