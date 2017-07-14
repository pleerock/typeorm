import "reflect-metadata";
import {expect} from "chai";
import {Connection} from "../../../src/connection/Connection";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Post} from "./entity/Post";

describe("github issues > #485 If I set the datatype of PrimaryGeneratedColumn to uuid then it is not giving the uuid to the column.", () => {

    let connections: Connection[];
    before(async () => {
        connections = await createTestingConnections({
            entities: [__dirname + "/entity/*{.js,.ts}"],
            enabledDrivers: ["postgres"],
            schemaCreate: true,
            dropSchemaOnConnection: true,
        });

        await Promise.all(connections.map(connection => {
            return connection.manager.query(`CREATE extension IF NOT EXISTS "uuid-ossp"`);
        }));
    });
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should persist uuid correctly when it used as PrimaryGeneratedColumn type", () => Promise.all(connections.map(async connection => {

        const postRepository = connection.getRepository(Post);
        const queryRunner = connection.createQueryRunner();
        const tableSchema = await queryRunner.loadTableSchema("post");
        await queryRunner.release();

        const post = new Post();
        const savedPost = await postRepository.save(post);
        const loadedPost = await postRepository.findOneById(savedPost.id);

        expect(loadedPost).to.be.not.undefined;
        expect(loadedPost!.id).to.equal(savedPost.id);
        tableSchema!.findColumnByName("id")!.type.should.be.equal("uuid");
    })));
});
