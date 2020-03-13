import "reflect-metadata";
import {expect} from "chai";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Connection} from "../../../src/connection/Connection";
import {Post} from "./entity/Post";

describe("entity-factory > custom entity factory", () => {
    
    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [Post],
        /**
         * Defining a custom entity factory that initializes entity by
         * calling its constructor.
         */
        entityFactory: {
            createEntity(target: Function) {
                return new (<any> target)();
            }
        },
        dropSchema: true
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should call the constructor", () => Promise.all(connections.map(async connection => {
        
        const postRepository = connection.getRepository(Post);

        // create and save a post first and check entity is initialized
        const post = new Post("About columns");
        await postRepository.save(post);

        expect(post.initialized).to.be.true;

        // check if entity loaded from database is initialized by constructor
        const loadedPost = await postRepository.findOne(1);
        expect(loadedPost).to.be.instanceof(Post);
        expect(loadedPost!.initialized).to.be.true;
        
    })));

});
