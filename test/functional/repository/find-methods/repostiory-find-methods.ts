import "reflect-metadata";
import {expect} from "chai";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../../utils/test-utils";
import {Connection} from "../../../../src/connection/Connection";
import {Post} from "./entity/Post";
import {User} from "./model/User";
import {EntityNotFoundError} from "../../../../src/error/EntityNotFoundError";
import {UserEntity} from "./schema/UserEntity";

describe("repository > find methods", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [Post, UserEntity],
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    describe("count", function () {
        it("should return a full count when no criteria given", () => Promise.all(connections.map(async connection => {
            const postRepository            = connection.getRepository(Post);
            const promises: Promise<Post>[] = [];
            for (let i = 0; i < 100; i++) {
                const post        = new Post();
                post.id           = i;
                post.title        = "post #" + i;
                post.categoryName = "other";
                promises.push(postRepository.save(post));
            }

            const savedPosts = await Promise.all(promises);
            savedPosts.length.should.be.equal(100); // check if they all are saved

            // check count method
            const count = await postRepository.count();
            count.should.be.equal(100);
        })));

        it("should return a count of posts that match given criteria", () => Promise.all(connections.map(async connection => {
            const postRepository = connection.getRepository(Post);
            const promises: Promise<Post>[] = [];
            for (let i = 1; i <= 100; i++) {
                const post        = new Post();
                post.id           = i;
                post.title        = "post #" + i;
                post.categoryName = i % 2 === 0 ? "even" : "odd";
                promises.push(postRepository.save(post));
            }

            const savedPosts = await Promise.all(promises);
            savedPosts.length.should.be.equal(100); // check if they all are saved

            // check count method
            const count = await postRepository.count({
                categoryName: "odd"
            });
            count.should.be.equal(50);
        })));

        it("should return a count of posts that match given multiple criteria", () => Promise.all(connections.map(async connection => {
            const postRepository            = connection.getRepository(Post);
            const promises: Promise<Post>[] = [];
            for (let i = 1; i <= 100; i++) {
                const post        = new Post();
                post.id           = i;
                post.title        = "post #" + i;
                post.categoryName = i % 2 === 0 ? "even" : "odd";
                post.isNew        = i > 90;
                promises.push(postRepository.save(post));
            }

            const savedPosts = await Promise.all(promises);
            savedPosts.length.should.be.equal(100); // check if they all are saved

            // check count method
            const count = await postRepository.count({
                categoryName: "odd",
                isNew: true
            });
            count.should.be.equal(5);
        })));

        it("should return a count of posts that match given find options", () => Promise.all(connections.map(async connection => {
            const postRepository            = connection.getRepository(Post);
            const promises: Promise<Post>[] = [];
            for (let i = 1; i <= 100; i++) {
                const post        = new Post();
                post.id           = i;
                post.isNew        = i > 90;
                post.title        = post.isNew ? "new post #" + i : "post #" + i;
                post.categoryName = i % 2 === 0 ? "even" : "odd";
                promises.push(postRepository.save(post));
            }

            const savedPosts = await Promise.all(promises);
            savedPosts.length.should.be.equal(100); // check if they all are saved

            // check count method
            const count = await postRepository.count();
            count.should.be.equal(100);
        })));

        it("should return a count of posts that match both criteria and find options", () => Promise.all(connections.map(async connection => {
            const postRepository            = connection.getRepository(Post);
            const promises: Promise<Post>[] = [];
            for (let i = 1; i <= 100; i++) {
                const post        = new Post();
                post.id           = i;
                post.isNew        = i > 90;
                post.title        = post.isNew ? "new post #" + i : "post #" + i;
                post.categoryName = i % 2 === 0 ? "even" : "odd";
                promises.push(postRepository.save(post));
            }

            const savedPosts = await Promise.all(promises);
            savedPosts.length.should.be.equal(100); // check if they all are saved

            // check count method
            const count = await postRepository.count({
                categoryName: "even",
                isNew: true
            });
            count.should.be.equal(5);
        })));
        
    });

    describe("find and findAndCount", function() {

        it("should return everything when no criteria given", () => Promise.all(connections.map(async connection => {
            const postRepository = connection.getRepository(Post);
            const promises: Promise<Post>[] = [];
            for (let i = 0; i < 100; i++) {
                const post = new Post();
                post.id = i;
                post.title = "post #" + i;
                post.categoryName = "other";
                promises.push(postRepository.save(post));
            }

            const savedPosts = await Promise.all(promises);
            savedPosts.length.should.be.equal(100); // check if they all are saved

            // check find method
            const loadedPosts = await postRepository.find({ order: { id: "ASC" }});
            loadedPosts.should.be.instanceOf(Array);
            loadedPosts.length.should.be.equal(100);
            loadedPosts[0].id.should.be.equal(0);
            loadedPosts[0].title.should.be.equal("post #0");
            loadedPosts[99].id.should.be.equal(99);
            loadedPosts[99].title.should.be.equal("post #99");

            // check findAndCount method
            let [loadedPosts2, count] = await postRepository.findAndCount({ order: { id: "ASC" }});
            count.should.be.equal(100);
            loadedPosts2.should.be.instanceOf(Array);
            loadedPosts2.length.should.be.equal(100);
            loadedPosts2[0].id.should.be.equal(0);
            loadedPosts2[0].title.should.be.equal("post #0");
            loadedPosts2[99].id.should.be.equal(99);
            loadedPosts2[99].title.should.be.equal("post #99");
        })));

        it("should return posts that match given criteria", () => Promise.all(connections.map(async connection => {
            const postRepository = connection.getRepository(Post);
            const promises: Promise<Post>[] = [];
            for (let i = 1; i <= 100; i++) {
                const post = new Post();
                post.id = i;
                post.title = "post #" + i;
                post.categoryName = i % 2 === 0 ? "even" : "odd";
                promises.push(postRepository.save(post));
            }

            const savedPosts = await Promise.all(promises);
            savedPosts.length.should.be.equal(100); // check if they all are saved

            // check find method
            const loadedPosts = await postRepository.find({
                where: { categoryName: "odd" },
                order: { id: "ASC" }
            });
            loadedPosts.should.be.instanceOf(Array);
            loadedPosts.length.should.be.equal(50);
            loadedPosts[0].id.should.be.equal(1);
            loadedPosts[0].title.should.be.equal("post #1");
            loadedPosts[49].id.should.be.equal(99);
            loadedPosts[49].title.should.be.equal("post #99");

            // check findAndCount method
            let [loadedPosts2, count] = await postRepository.findAndCount({
                where: { categoryName: "odd" },
                order: { id: "ASC" }
            });
            count.should.be.equal(50);
            loadedPosts2.should.be.instanceOf(Array);
            loadedPosts2.length.should.be.equal(50);
            loadedPosts2[0].id.should.be.equal(1);
            loadedPosts2[0].title.should.be.equal("post #1");
            loadedPosts2[49].id.should.be.equal(99);
            loadedPosts2[49].title.should.be.equal("post #99");
        })));

        it("should return posts that match given multiple criteria", () => Promise.all(connections.map(async connection => {
            const postRepository = connection.getRepository(Post);
            const promises: Promise<Post>[] = [];
            for (let i = 1; i <= 100; i++) {
                const post = new Post();
                post.id = i;
                post.title = "post #" + i;
                post.categoryName = i % 2 === 0 ? "even" : "odd";
                post.isNew = i > 90;
                promises.push(postRepository.save(post));
            }

            const savedPosts = await Promise.all(promises);
            savedPosts.length.should.be.equal(100); // check if they all are saved

            // check find method
            const loadedPosts = await postRepository.find({
                where: { categoryName: "odd", isNew: true },
                order: { id: "ASC" }
            });
            loadedPosts.should.be.instanceOf(Array);
            loadedPosts.length.should.be.equal(5);
            loadedPosts[0].id.should.be.equal(91);
            loadedPosts[0].title.should.be.equal("post #91");
            loadedPosts[4].id.should.be.equal(99);
            loadedPosts[4].title.should.be.equal("post #99");

            // check findAndCount method
            let [loadedPosts2, count] = await postRepository.findAndCount({
                where: { categoryName: "odd", isNew: true },
                order: { id: "ASC" }
            });
            count.should.be.equal(5);
            loadedPosts2.should.be.instanceOf(Array);
            loadedPosts2.length.should.be.equal(5);
            loadedPosts2[0].id.should.be.equal(91);
            loadedPosts2[0].title.should.be.equal("post #91");
            loadedPosts2[4].id.should.be.equal(99);
            loadedPosts2[4].title.should.be.equal("post #99");
        })));

        it("should return posts that match given find options", () => Promise.all(connections.map(async connection => {
            const postRepository = connection.getRepository(Post);
            const promises: Promise<Post>[] = [];
            for (let i = 1; i <= 100; i++) {
                const post = new Post();
                post.id = i;
                post.isNew = i > 90;
                post.title = post.isNew ? "new post #" + i : "post #" + i;
                post.categoryName = i % 2 === 0 ? "even" : "odd";
                promises.push(postRepository.save(post));
            }

            const savedPosts = await Promise.all(promises);
            savedPosts.length.should.be.equal(100); // check if they all are saved

            // check find method
            const loadedPosts = await postRepository.createQueryBuilder("post")
                .where("post.title LIKE :likeTitle AND post.categoryName = :categoryName")
                .setParameters({
                    likeTitle: "new post #%",
                    categoryName: "even"
                })
                .orderBy("post.id", "ASC")
                .getMany();
            loadedPosts.should.be.instanceOf(Array);
            loadedPosts.length.should.be.equal(5);
            loadedPosts[0].id.should.be.equal(92);
            loadedPosts[0].title.should.be.equal("new post #92");
            loadedPosts[4].id.should.be.equal(100);
            loadedPosts[4].title.should.be.equal("new post #100");

            // check findAndCount method
            const [loadedPosts2, count] = await postRepository.createQueryBuilder("post")
                .where("post.title LIKE :likeTitle AND post.categoryName = :categoryName")
                .setParameters({
                    likeTitle: "new post #%",
                    categoryName: "even"
                })
                .orderBy("post.id", "ASC")
                .getManyAndCount();
            count.should.be.equal(5);
            loadedPosts2.should.be.instanceOf(Array);
            loadedPosts2.length.should.be.equal(5);
            loadedPosts2[0].id.should.be.equal(92);
            loadedPosts2[0].title.should.be.equal("new post #92");
            loadedPosts2[4].id.should.be.equal(100);
            loadedPosts2[4].title.should.be.equal("new post #100");
        })));

        it("should return posts that match both criteria and find options", () => Promise.all(connections.map(async connection => {
            const postRepository = connection.getRepository(Post);
            const promises: Promise<Post>[] = [];
            for (let i = 1; i <= 100; i++) {
                const post = new Post();
                post.id = i;
                post.isNew = i > 90;
                post.title = post.isNew ? "new post #" + i : "post #" + i;
                post.categoryName = i % 2 === 0 ? "even" : "odd";
                promises.push(postRepository.save(post));
            }

            const savedPosts = await Promise.all(promises);
            savedPosts.length.should.be.equal(100); // check if they all are saved

            // check find method
            const loadedPosts = await postRepository.find({
                where: {
                    categoryName: "even",
                    isNew: true
                },
                skip: 1,
                take: 2,
                order: {
                    id: "ASC"
                }
            });
            loadedPosts.should.be.instanceOf(Array);
            loadedPosts.length.should.be.equal(2);
            loadedPosts[0].id.should.be.equal(94);
            loadedPosts[0].title.should.be.equal("new post #94");
            loadedPosts[1].id.should.be.equal(96);
            loadedPosts[1].title.should.be.equal("new post #96");

            // check findAndCount method
            let [loadedPosts2, count] = await postRepository.findAndCount({
                where: {
                    categoryName: "even",
                    isNew: true
                },
                skip: 1,
                take: 2,
                order: {
                    id: "ASC"
                }
            });
            count.should.be.equal(5);
            loadedPosts2.should.be.instanceOf(Array);
            loadedPosts2.length.should.be.equal(2);
            loadedPosts2[0].id.should.be.equal(94);
            loadedPosts2[0].title.should.be.equal("new post #94");
            loadedPosts2[1].id.should.be.equal(96);
            loadedPosts2[1].title.should.be.equal("new post #96");
        })));

    });

    describe("findOne", function() {

        it("should return first when no criteria given", () => Promise.all(connections.map(async connection => {
            const userRepository = connection.getRepository<User>("User");
            const promises: Promise<User>[] = [];
            for (let i = 0; i < 100; i++) {
                const user: User = {
                    id: i,
                    firstName: "name #" + i,
                    secondName: "Doe"
                };
                promises.push(userRepository.save(user));
            }

            const savedUsers = await Promise.all(promises);
            savedUsers.length.should.be.equal(100); // check if they all are saved

            const loadedUser = (await userRepository.findOne({ order: { id: "ASC" }}))!;
            loadedUser.id.should.be.equal(0);
            loadedUser.firstName.should.be.equal("name #0");
            loadedUser.secondName.should.be.equal("Doe");
        })));

        it("should return when criteria given", () => Promise.all(connections.map(async connection => {
            const userRepository = connection.getRepository<User>("User");
            const promises: Promise<User>[] = [];
            for (let i = 0; i < 100; i++) {
                const user: User = {
                    id: i,
                    firstName: "name #" + i,
                    secondName: "Doe"
                };
                promises.push(userRepository.save(user));
            }

            const savedUsers = await Promise.all(promises);
            savedUsers.length.should.be.equal(100); // check if they all are saved

            const loadedUser = (await userRepository.findOne({ where: { firstName: "name #1" }, order: { id: "ASC" } }))!;
            loadedUser.id.should.be.equal(1);
            loadedUser.firstName.should.be.equal("name #1");
            loadedUser.secondName.should.be.equal("Doe");
        })));

        it("should return when find options given", () => Promise.all(connections.map(async connection => {
            const userRepository = connection.getRepository<User>("User");
            const promises: Promise<User>[] = [];
            for (let i = 0; i < 100; i++) {
                const user: User = {
                    id: i,
                    firstName: "name #" + i,
                    secondName: "Doe"
                };
                promises.push(userRepository.save(user));
            }

            const savedUsers = await Promise.all(promises);
            savedUsers.length.should.be.equal(100); // check if they all are saved

            const loadedUser = await userRepository.findOne({
                where: {
                    firstName: "name #99",
                    secondName: "Doe"
                },
                order: {
                    id: "ASC"
                }
            });
            loadedUser!.id.should.be.equal(99);
            loadedUser!.firstName.should.be.equal("name #99");
            loadedUser!.secondName.should.be.equal("Doe");
        })));

    });

    describe("findOne", function() {

        it("should return entity by a given id", () => Promise.all(connections.map(async connection => {
            const userRepository = connection.getRepository<User>("User");
            const promises: Promise<User>[] = [];
            for (let i = 0; i < 100; i++) {
                const user: User = {
                    id: i,
                    firstName: "name #" + i,
                    secondName: "Doe"
                };
                promises.push(userRepository.save(user));
            }

            const savedUsers = await Promise.all(promises);
            savedUsers.length.should.be.equal(100); // check if they all are saved

            let loadedUser = (await userRepository.findOne(0))!;
            loadedUser.id.should.be.equal(0);
            loadedUser.firstName.should.be.equal("name #0");
            loadedUser.secondName.should.be.equal("Doe");

            loadedUser = (await userRepository.findOne(1))!;
            loadedUser.id.should.be.equal(1);
            loadedUser.firstName.should.be.equal("name #1");
            loadedUser.secondName.should.be.equal("Doe");

            loadedUser = (await userRepository.findOne(99))!;
            loadedUser.id.should.be.equal(99);
            loadedUser.firstName.should.be.equal("name #99");
            loadedUser.secondName.should.be.equal("Doe");
        })));

        it("should return entity by a given id and find options", () => Promise.all(connections.map(async connection => {
            const userRepository = connection.getRepository<User>("User");
            const promises: Promise<User>[] = [];
            for (let i = 0; i < 100; i++) {
                const user: User = {
                    id: i,
                    firstName: "name #" + i,
                    secondName: "Doe"
                };
                promises.push(userRepository.save(user));
            }

            const savedUsers = await Promise.all(promises);
            savedUsers.length.should.be.equal(100); // check if they all are saved

            let loadedUser = await userRepository.findOne(0, {
                where: {
                    secondName: "Doe"
                }
            });
            loadedUser!.id.should.be.equal(0);
            loadedUser!.firstName.should.be.equal("name #0");
            loadedUser!.secondName.should.be.equal("Doe");

            loadedUser = await userRepository.findOne(1, {
                where: {
                    secondName: "Dorian"
                }
            });
            expect(loadedUser).to.be.undefined;
        })));

    });

    describe("findByIds", function() {

        it("should return entities by given ids", () => Promise.all(connections.map(async connection => {
            const userRepository = connection.getRepository<User>("User");

            const users = [1, 2, 3, 4, 5].map(id => {
                return {
                    id,
                    firstName: `name #${id}`,
                    secondName: "Doe"
                };
            });

            const savedUsers = await userRepository.save(users);
            savedUsers.length.should.be.equal(users.length); // check if they all are saved

            const loadIds = [1, 2, 4];
            const loadedUsers = (await userRepository.findByIds(loadIds))!;

            loadedUsers.map(user => user.id).should.be.eql(loadIds);
        })));

    });

    describe("findOneOrFail", function() {

        it("should return entity by a given id", () => Promise.all(connections.map(async connection => {
            const userRepository = connection.getRepository<User>("User");
            const promises: Promise<User>[] = [];
            for (let i = 0; i < 100; i++) {
                const user: User = {
                    id: i,
                    firstName: "name #" + i,
                    secondName: "Doe"
                };
                promises.push(userRepository.save(user));
            }

            const savedUsers = await Promise.all(promises);
            savedUsers.length.should.be.equal(100); // check if they all are saved

            let loadedUser = (await userRepository.findOneOrFail(0))!;
            loadedUser.id.should.be.equal(0);
            loadedUser.firstName.should.be.equal("name #0");
            loadedUser.secondName.should.be.equal("Doe");

            loadedUser = (await userRepository.findOneOrFail(1))!;
            loadedUser.id.should.be.equal(1);
            loadedUser.firstName.should.be.equal("name #1");
            loadedUser.secondName.should.be.equal("Doe");

            loadedUser = (await userRepository.findOneOrFail(99))!;
            loadedUser.id.should.be.equal(99);
            loadedUser.firstName.should.be.equal("name #99");
            loadedUser.secondName.should.be.equal("Doe");
        })));

        it("should return entity by a given id and find options", () => Promise.all(connections.map(async connection => {
            const userRepository = connection.getRepository<User>("User");
            const promises: Promise<User>[] = [];
            for (let i = 0; i < 100; i++) {
                const user: User = {
                    id: i,
                    firstName: "name #" + i,
                    secondName: "Doe"
                };
                promises.push(userRepository.save(user));
            }

            const savedUsers = await Promise.all(promises);
            savedUsers.length.should.be.equal(100); // check if they all are saved

            let loadedUser = await userRepository.findOneOrFail(0, {
                where: {
                    secondName: "Doe"
                }
            });
            loadedUser!.id.should.be.equal(0);
            loadedUser!.firstName.should.be.equal("name #0");
            loadedUser!.secondName.should.be.equal("Doe");

            await userRepository.findOneOrFail(1, {
                where: {
                    secondName: "Dorian"
                }
            }).should.eventually.be.rejectedWith(EntityNotFoundError);
        })));

        it("should throw an error if nothing was found", () => Promise.all(connections.map(async connection => {
            const userRepository = connection.getRepository<User>("User");
            const promises: Promise<User>[] = [];
            for (let i = 0; i < 100; i++) {
                const user: User = {
                    id: i,
                    firstName: "name #" + i,
                    secondName: "Doe"
                };
                promises.push(userRepository.save(user));
            }

            const savedUsers = await Promise.all(promises);
            savedUsers.length.should.be.equal(100); // check if they all are saved

            await userRepository.findOneOrFail(100).should.eventually.be.rejectedWith(EntityNotFoundError);
        })));
    });

});
