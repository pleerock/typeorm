import "reflect-metadata";
import {Connection} from "../../../../src";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../../utils/test-utils";
import {Post} from "./entity/Post";
import {prepareData} from "./find-options-test-utils";
import { expect } from "chai";

describe("find options > relations", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({ __dirname }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("basic relation", () => Promise.all(connections.map(async connection => {
        await prepareData(connection.manager);

        const posts1 = await connection.createQueryBuilder(Post, "post").setFindOptions({
            relations: {
                author: true
            },
            order: {
                id: "asc"
            }
        }).getMany();
        posts1.should.be.eql([
            { id: 1, title: "Post #1", text: "About post #1", counters: { likes: 1 }, author: { id: 1, age: 25, firstName: "Timber", lastName: "Saw" } },
            { id: 2, title: "Post #2", text: "About post #2", counters: { likes: 2 }, author: { id: 1, age: 25, firstName: "Timber", lastName: "Saw" } },
            { id: 3, title: "Post #3", text: "About post #3", counters: { likes: 1 }, author: { id: 2, age: 52, firstName: "Gyro", lastName: "Copter" } },
        ]);

        const posts2 = await connection.createQueryBuilder(Post, "post").setFindOptions({
            relations: ["author"],
            order: {
                id: "asc"
            }
        }).getMany();
        posts2.should.be.eql([
            { id: 1, title: "Post #1", text: "About post #1", counters: { likes: 1 }, author: { id: 1, age: 25, firstName: "Timber", lastName: "Saw" } },
            { id: 2, title: "Post #2", text: "About post #2", counters: { likes: 2 }, author: { id: 1, age: 25, firstName: "Timber", lastName: "Saw" } },
            { id: 3, title: "Post #3", text: "About post #3", counters: { likes: 1 }, author: { id: 2, age: 52, firstName: "Gyro", lastName: "Copter" } },
        ]);

    })));

    it("complex relation #1", () => Promise.all(connections.map(async connection => {

        await prepareData(connection.manager);

        const posts = await connection.createQueryBuilder(Post, "post").setFindOptions({
            select: {
                author: {
                    id: true,
                    age: true
                }
            },
            relations: {
                author: {
                    photos: true
                }
            },
            order: {
                author: {
                    age: "desc",
                    photos: {
                        filename: "asc"
                    }
                }
            }
        }).getMany();

        posts.should.have.deep.members([
            {
                id: 3,
                title: "Post #3",
                text: "About post #3",
                counters: {
                    likes: 1
                },
                author: {
                    id: 2,
                    age: 52,
                    photos: []
                }
            },
            {
                id: 1,
                title: "Post #1",
                text: "About post #1",
                counters: {
                    likes: 1
                },
                author: {
                    id: 1,
                    age: 25,
                    photos: [
                        { id: 2, filename: "chain.jpg", description: "Me and chain" },
                        { id: 1, filename: "saw.jpg", description: "Me and saw" }
                    ]
                }
            },
            {
                id: 2,
                title: "Post #2",
                text: "About post #2",
                counters: {
                    likes: 2
                },
                author: {
                    id: 1,
                    age: 25,
                    photos: [
                        { id: 2, filename: "chain.jpg", description: "Me and chain" },
                        { id: 1, filename: "saw.jpg", description: "Me and saw" }
                    ]
                }
            }
        ]);
        expect(posts[0].id).to.be.eql(3);
        expect(posts[1].id).to.be.oneOf([1, 2]);
        expect(posts[2].id).to.be.oneOf([1, 2]);
        expect(posts[1].id).to.not.be.eql(posts[2].id);

    })));

    it("complex relation #2", () => Promise.all(connections.map(async connection => {
        await prepareData(connection.manager);

        const posts = await connection.createQueryBuilder(Post, "post").setFindOptions({
            select: {
                tags: {
                    id: true
                }
            },
            relations: {
                author: ["photos"],
                tags: true
            },
            order: {
                id: "asc"
            }
        }).getMany();
        posts.should.be.eql([
            {
                id: 1,
                title: "Post #1",
                text: "About post #1",
                counters: {
                    likes: 1
                },
                author: {
                    id: 1,
                    age: 25,
                    firstName: "Timber",
                    lastName: "Saw",
                    photos: [
                        { id: 1, filename: "saw.jpg", description: "Me and saw" },
                        { id: 2, filename: "chain.jpg", description: "Me and chain" }
                    ]
                },
                tags: [
                    { id: 1 },
                    { id: 2 },
                ]
            },
            {
                id: 2,
                title: "Post #2",
                text: "About post #2",
                counters: {
                    likes: 2
                },
                author: {
                    id: 1,
                    age: 25,
                    firstName: "Timber",
                    lastName: "Saw",
                    photos: [
                        { id: 1, filename: "saw.jpg", description: "Me and saw" },
                        { id: 2, filename: "chain.jpg", description: "Me and chain" }
                    ]
                },
                tags: [
                    { id: 2 }
                ]
            },
            {
                id: 3,
                title: "Post #3",
                text: "About post #3",
                counters: {
                    likes: 1
                },
                author: {
                    id: 2,
                    firstName: "Gyro",
                    lastName: "Copter",
                    age: 52,
                    photos: []
                },
                tags: [
                    { id: 1 }
                ]
            },
        ]);
    })));

    it("relation in embed", () => Promise.all(connections.map(async connection => {
        await prepareData(connection.manager);

        const posts = await connection.createQueryBuilder(Post, "post").setFindOptions({
            relations: {
                counters: {
                    likedUsers: {
                        photos: true
                    }
                }
            }
        }).getMany();
        posts.should.be.eql([
            {
                id: 1,
                title: "Post #1",
                text: "About post #1",
                counters: {
                    likes: 1,
                    likedUsers: [{
                        id: 1,
                        age: 25,
                        firstName: "Timber",
                        lastName: "Saw",
                        photos: [
                            { id: 1, filename: "saw.jpg", description: "Me and saw" },
                            { id: 2, filename: "chain.jpg", description: "Me and chain" }
                        ]
                    }]
                },
            },
            {
                id: 2,
                title: "Post #2",
                text: "About post #2",
                counters: {
                    likes: 2,
                    likedUsers: [{
                        id: 1,
                        age: 25,
                        firstName: "Timber",
                        lastName: "Saw",
                        photos: [
                            { id: 1, filename: "saw.jpg", description: "Me and saw" },
                            { id: 2, filename: "chain.jpg", description: "Me and chain" }
                        ]
                    }, {
                        id: 2,
                        firstName: "Gyro",
                        lastName: "Copter",
                        age: 52,
                        photos: []
                    }]
                },
            },
            {
                id: 3,
                title: "Post #3",
                text: "About post #3",
                counters: {
                    likes: 1,
                    likedUsers: [{
                        id: 2,
                        firstName: "Gyro",
                        lastName: "Copter",
                        age: 52,
                        photos: []
                    }]
                },
            },
        ]);

    })));

});
