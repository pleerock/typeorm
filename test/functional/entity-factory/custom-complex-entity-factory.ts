import "reflect-metadata";
import { expect } from "chai";
import { closeTestingConnections, createTestingConnections, reloadTestingDatabases } from "../../utils/test-utils";
import { Connection } from "../../../src/connection/Connection";
import { Post } from "./entity/Post";
import { PostVersioned } from "./entity/PostVersioned";
import { EntityMetadata } from "../../../src";

describe("entity-factory > custom complex entity factory", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [Post, PostVersioned],
        entityFactory: {
            createEntity(target: Function, entityMetadata: EntityMetadata) {
                // Creating an entity not initialized by constructor
                // (Same as default behavior)
                let entity: any = {};
                Reflect.setPrototypeOf(entity, target.prototype);

                // Proxifying the entity to intercept method calls.
                // Here we choose to only proxify our versioned entities.
                // Other entities are not proxified.
                
                if (entityMetadata.versionColumn) {
                    return new Proxy(
                        entity,
                        {
                            get(target, propKey, receiver) {
            
                                const property = target[propKey];
                                
                                if (property instanceof Function) {
                                    return function (...args: any[]) {
                                        const result = property.apply(this, args);
                                        return result + " !!!";
                                    };
                                }
                                
                                return property;
                            }
                        }
                    );
                }

                return entity;
                
            }
        },
        dropSchema: true
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should proxify versioned entity", () => Promise.all(connections.map(async connection => {

        // Create and save a versioned post and check entity is initialized
        const postVersionedRepository = connection.getRepository(PostVersioned);
        const postVersioned = new PostVersioned("About columns");
        await postVersionedRepository.save(postVersioned);
        expect(postVersioned.initialized).to.be.true;

        // Check if entity loaded from database is not initialized by constructor.
        // Check that our versioned entity has been proxified.

        const loadedPostVersioned = await postVersionedRepository.findOne(1);
        expect(loadedPostVersioned).to.be.instanceof(PostVersioned);
        expect(loadedPostVersioned!.initialized).to.be.undefined;
        expect(loadedPostVersioned!.getTitle()).to.be.equal("About columns !!!");

    })));

    it("should not proxify non-versioned entity", () => Promise.all(connections.map(async connection => {

        // Create and save a post and check entity is initialized
        const postRepository = connection.getRepository(Post);
        const post = new Post("About columns");
        await postRepository.save(post);
        expect(post.initialized).to.be.true;

        // Check if entity loaded from database is not initialized by constructor.
        // Check that our non-versioned entity has not been proxified.

        const loadedPost = await postRepository.findOne(1);
        expect(loadedPost).to.be.instanceof(Post);
        expect(loadedPost!.initialized).to.be.undefined;
        expect(loadedPost!.getTitle()).to.be.equal("About columns");

    })));

});
