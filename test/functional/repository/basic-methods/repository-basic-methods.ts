import "reflect-metadata";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../../utils/test-utils";
import {Connection} from "../../../../src/connection/Connection";
import {Post} from "./entity/Post";
import {QueryBuilder} from "../../../../src/query-builder/QueryBuilder";
import {User} from "./model/User";
import questionSchema from "./model-schema/QuestionSchema";
import {Question} from "./model/Question";
import {Blog} from "./entity/Blog";
import {Category} from "./entity/Category";
import {DeepPartial} from "../../../../src/common/DeepPartial";
import {EntitySchema, OldEntityFactory, Repository} from "../../../../src";

describe("repository > basic methods", () => {

    let userSchema: any;
    try {
        const resourceDir = __dirname + "/../../../../../../test/functional/repository/basic-methods/";
        userSchema = require(resourceDir + "schema/user.json");
    } catch (err) {
        const resourceDir = __dirname + "/";
        userSchema = require(resourceDir + "schema/user.json");
    }
    const UserEntity = new EntitySchema<any>(userSchema);
    const QuestionEntity = new EntitySchema<any>(questionSchema as any);

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [Post, Blog, Category, UserEntity, QuestionEntity],
        entityFactory:  new OldEntityFactory()

    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    describe("target", function() {

        it("should return instance of the object it manages", () => connections.forEach(connection => {
            const postRepository = connection.getRepository(Post);
            postRepository.target.should.be.equal(Post);
            const userRepository = connection.getRepository<User>("User");
            userRepository.target.should.be.equal("User");
            const questionRepository = connection.getRepository<Question>("Question");
            questionRepository.target.should.be.instanceOf(Function);
        }));

    });

    describe("hasId", function() {

        it("should return true if entity has an id", () => connections.forEach(connection => {
            const postRepository = connection.getRepository(Post);
            const userRepository = connection.getRepository("User");

            const postWithId = new Post();
            postWithId.id = 1;
            postWithId.title = "Hello post";
            postRepository.hasId(postWithId).should.be.equal(true);

            const postWithZeroId = new Post();
            postWithZeroId.id = 0;
            postWithZeroId.title = "Hello post";
            postRepository.hasId(postWithZeroId).should.be.equal(true);

            const userWithId: User = {
                id: 1,
                firstName: "Jonh",
                secondName: "Doe"
            };
            userRepository.hasId(userWithId).should.be.equal(true);

            const userWithZeroId: User = {
                id: 1,
                firstName: "Jonh",
                secondName: "Doe"
            };
            userRepository.hasId(userWithZeroId).should.be.equal(true);

        }));

        it("should return false if entity does not have an id", () => connections.forEach(connection => {
            const postRepository = connection.getRepository(Post);
            const userRepository = connection.getRepository("User");

            postRepository.hasId(null as any).should.be.equal(false);
            postRepository.hasId(undefined as any).should.be.equal(false);

            const postWithoutId = new Post();
            postWithoutId.title = "Hello post";
            postRepository.hasId(postWithoutId).should.be.equal(false);

            const postWithUndefinedId = new Post();
            postWithUndefinedId.id = undefined;
            postWithUndefinedId.title = "Hello post";
            postRepository.hasId(postWithUndefinedId).should.be.equal(false);

            const postWithNullId = new Post();
            postWithNullId.id = null;
            postWithNullId.title = "Hello post";
            postRepository.hasId(postWithNullId).should.be.equal(false);

            const postWithEmptyId = new Post();
            postWithEmptyId.id = "";
            postWithEmptyId.title = "Hello post";
            postRepository.hasId(postWithEmptyId).should.be.equal(false);

            const userWithoutId: User = {
                firstName: "Jonh",
                secondName: "Doe"
            };
            userRepository.hasId(userWithoutId).should.be.equal(false);

            const userWithNullId: User = {
                id: null,
                firstName: "Jonh",
                secondName: "Doe"
            };
            userRepository.hasId(userWithNullId).should.be.equal(false);

            const userWithUndefinedId: User = {
                id: undefined,
                firstName: "Jonh",
                secondName: "Doe"
            };
            userRepository.hasId(userWithUndefinedId).should.be.equal(false);
        }));

    });

    describe("createQueryBuilder", function() {

        it("should create a new query builder with the given alias", () => connections.forEach(connection => {
            const postRepository = connection.getRepository(Post);
            const postQb = postRepository.createQueryBuilder("post");
            postQb.should.be.instanceOf(QueryBuilder);
            postQb.alias.should.be.equal("post");
            const userRepository = connection.getRepository("User");
            const userQb = userRepository.createQueryBuilder("user");
            userQb.should.be.instanceOf(QueryBuilder);
            userQb.alias.should.be.equal("user");
            const questionRepository = connection.getRepository("Question");
            const questionQb = questionRepository.createQueryBuilder("question");
            questionQb.should.be.instanceOf(QueryBuilder);
            questionQb.alias.should.be.equal("question");
        }));

    });

    describe("create", function() {

        it("should create a new instance of the object we are working with", () => connections.forEach(connection => {
            const repository = connection.getRepository(Post);
            repository.create().should.be.instanceOf(Post);
        }));

        it("should create a new empty object if entity schema is used", () => connections.forEach(connection => {
            const repository = connection.getRepository("User") as Repository<User>;
            repository.create().should.be.eql({});
        }));

        it("should create a new empty object if entity schema with a target is used", () => connections.forEach(connection => {
            const repository = connection.getRepository<Question>("Question");
            repository.create().should.not.be.undefined;
            repository.create().should.not.be.null;
            repository.create().type.should.be.equal("question"); // make sure this is our Question function
        }));

        it("should create an entity and copy to it all properties of the given plain object if its given", () => connections.forEach(connection => {
            const postRepository = connection.getRepository(Post);
            const userRepository = connection.getRepository<User>("User");
            const questionRepository = connection.getRepository<Question>("Question");

            const plainPost = { id: 2, title: "Hello post" };
            const post = postRepository.create(plainPost);
            post.should.be.instanceOf(Post);
            (post.id as number).should.be.equal(2);
            post.title.should.be.equal("Hello post");

            const plainUser = { id: 3, firstName: "John", secondName: "Doe" };
            const user = userRepository.create(plainUser);
            (user.id as number).should.be.equal(3);
            (user.firstName as string).should.be.equal("John");
            (user.secondName as string).should.be.equal("Doe");

            const plainQuestion = { id: 3, title: "What is better?" };
            const question = questionRepository.create(plainQuestion);
            (question.id as number).should.be.equal(3);
            (question.title as string).should.be.equal("What is better?");
        }));

    });

    describe("createMany", function() {

        it("should create entities and copy to them all properties of the given plain object if its given", () => connections.forEach(connection => {
            const postRepository = connection.getRepository(Post);
            const plainPosts = [{ id: 2, title: "Hello post" }, { id: 3, title: "Bye post" }];
            const posts = postRepository.create(plainPosts);
            posts.length.should.be.equal(2);
            posts[0].should.be.instanceOf(Post);
            (posts[0].id as number).should.be.equal(2);
            posts[0].title.should.be.equal("Hello post");
            posts[1].should.be.instanceOf(Post);
            (posts[1].id as number).should.be.equal(3);
            posts[1].title.should.be.equal("Bye post");
        }));

    });

    describe("preload", function() {

        it("should preload entity from the given object with only id", () => Promise.all(connections.map(async connection => {
            const blogRepository = connection.getRepository(Blog);
            const categoryRepository = connection.getRepository(Category);

            // save the category
            const category = new Category();
            category.name = "people";
            await categoryRepository.save(category);

            // save the blog
            const blog = new Blog();
            blog.title = "About people";
            blog.text = "Blog about good people";
            blog.categories = [category];
            await blogRepository.save(blog);

            // and preload it
            const plainBlogWithId = { id: 1 };
            const preloadedBlog = await blogRepository.preload(plainBlogWithId);
            preloadedBlog!.should.be.instanceOf(Blog);
            preloadedBlog!.id.should.be.equal(1);
            preloadedBlog!.title.should.be.equal("About people");
            preloadedBlog!.text.should.be.equal("Blog about good people");
        })));

        it("should preload entity and all relations given in the object", () => Promise.all(connections.map(async connection => {
            const blogRepository = connection.getRepository(Blog);
            const categoryRepository = connection.getRepository(Category);

            // save the category
            const category = new Category();
            category.name = "people";
            await categoryRepository.save(category);

            // save the blog
            const blog = new Blog();
            blog.title = "About people";
            blog.text = "Blog about good people";
            blog.categories = [category];
            await blogRepository.save(blog);

            // and preload it
            const plainBlogWithId = { id: 1, categories: [{ id: 1 }] };
            const preloadedBlog = await blogRepository.preload(plainBlogWithId);
            preloadedBlog!.should.be.instanceOf(Blog);
            preloadedBlog!.id.should.be.equal(1);
            preloadedBlog!.title.should.be.equal("About people");
            preloadedBlog!.text.should.be.equal("Blog about good people");
            preloadedBlog!.categories[0].id.should.be.equal(1);
            preloadedBlog!.categories[0].name.should.be.equal("people");
        })));

    });

    describe("merge", function() {

        it("should merge multiple entities", () => Promise.all(connections.map(async connection => {
            const blogRepository = connection.getRepository(Blog);

            const originalEntity = new Blog();

            // first entity
            const blog1 = new Blog();
            blog1.title = "First Blog";

            // second entity
            const blog2 = new Blog();
            blog2.text = "text is from second blog";

            // third entity
            const category = new Category();
            category.name = "category from third blog";
            const blog3 = new Blog();
            blog3.categories = [category];

            const mergedBlog = blogRepository.merge(originalEntity, blog1, blog2, blog3);

            mergedBlog.should.be.instanceOf(Blog);
            mergedBlog.should.be.equal(originalEntity);
            mergedBlog.should.not.be.equal(blog1);
            mergedBlog.should.not.be.equal(blog2);
            mergedBlog.should.not.be.equal(blog3);
            mergedBlog.title.should.be.equal("First Blog");
            mergedBlog.text.should.be.equal("text is from second blog");
            mergedBlog.categories[0].name.should.be.equal("category from third blog");
        })));

        it("should merge both entities and plain objects", () => Promise.all(connections.map(async connection => {
            const blogRepository = connection.getRepository(Blog);

            const originalEntity = new Blog();

            // first entity
            const blog1 = { title: "First Blog" };

            // second entity
            const blog2 = { text: "text is from second blog" };

            // third entity
            const blog3 = new Blog();
            blog3.categories = [{ name: "category from third blog" } as Category];

            const mergedBlog = blogRepository.merge(originalEntity, blog1, blog2, blog3);

            mergedBlog.should.be.instanceOf(Blog);
            mergedBlog.should.be.equal(originalEntity);
            mergedBlog.should.not.be.equal(blog1);
            mergedBlog.should.not.be.equal(blog2);
            mergedBlog.should.not.be.equal(blog3);
            mergedBlog.title.should.be.equal("First Blog");
            mergedBlog.text.should.be.equal("text is from second blog");
            mergedBlog.categories[0].name.should.be.equal("category from third blog");
        })));

    });

    describe("save", function () {
        it("should update existing entity using transformers", async () => {
            const connection = connections.find((c: Connection) => c.name === "sqlite");
            if (!connection || (connection.options as any).skip === true) {
                return;
            }

            const post = new Post();
            const date = new Date("2018-01-01 01:00:00");
            post.dateAdded = date;
            post.title = "Post title";
            post.id = 1;

            const postRepository = connection.getRepository(Post);

            await postRepository.save(post);

            const dbPost = await postRepository.findOne(post.id) as Post;
            dbPost.should.be.instanceOf(Post);
            dbPost.dateAdded.should.be.instanceOf(Date);
            dbPost.dateAdded.getTime().should.be.equal(date.getTime());

            dbPost.title = "New title";
            const saved = await postRepository.save(dbPost);

            saved.should.be.instanceOf(Post);

            saved.id!.should.be.equal(1);
            saved.title.should.be.equal("New title");
            saved.dateAdded.should.be.instanceof(Date);
            saved.dateAdded.getTime().should.be.equal(date.getTime());
        });
    });

    describe("preload also should also implement merge functionality", function() {

        it("if we preload entity from the plain object and merge preloaded object with plain object we'll have an object from the db with the replaced properties by a plain object's properties", () => Promise.all(connections.map(async connection => {
            const blogRepository = connection.getRepository(Blog);
            const categoryRepository = connection.getRepository(Category);

            // save first category
            const firstCategory = new Category();
            firstCategory.name = "people";
            await categoryRepository.save(firstCategory);

            // save second category
            const secondCategory = new Category();
            secondCategory.name = "animals";
            await categoryRepository.save(secondCategory);

            // save the blog
            const blog = new Blog();
            blog.title = "About people";
            blog.text = "Blog about good people";
            blog.categories = [firstCategory, secondCategory];
            await blogRepository.save(blog);

            // and preload it
            const plainBlogWithId: DeepPartial<Blog> = {
                id: 1,
                title: "changed title about people",
                categories: [ { id: 1 }, { id: 2, name: "insects" } ]
            };
            const preloadedBlog = await blogRepository.preload(plainBlogWithId);
            preloadedBlog!.should.be.instanceOf(Blog);
            preloadedBlog!.id.should.be.equal(1);
            preloadedBlog!.title.should.be.equal("changed title about people");
            preloadedBlog!.text.should.be.equal("Blog about good people");
            preloadedBlog!.categories[0].id.should.be.equal(1);
            preloadedBlog!.categories[0].name.should.be.equal("people");
            preloadedBlog!.categories[1].id.should.be.equal(2);
            preloadedBlog!.categories[1].name.should.be.equal("insects");
        })));

    });

    describe("query", function() {

        it("should execute the query natively and it should return the result", () => Promise.all(connections.map(async connection => {
            const repository = connection.getRepository(Blog);
            const promises: Promise<Blog>[] = [];
            for (let i = 0; i < 5; i++) { // todo: should pass with 50 items. find the problem
                const blog = new Blog();
                blog.title = "hello blog";
                blog.text = "hello blog #" + i;
                blog.counter = i * 100;
                promises.push(repository.save(blog));
            }
            await Promise.all(promises);
            // such simple query should work on all platforms, isn't it? If no - make requests specifically to platforms
            const query = `SELECT MAX(${connection.driver.escape("blog")}.${connection.driver.escape("counter")}) as ${connection.driver.escape("max")} ` +
                ` FROM ${connection.driver.escape("blog")} ${connection.driver.escape("blog")}`;
            const result = await repository.query(query);
            result[0].should.not.be.undefined;
            result[0].max.should.not.be.undefined;
        })));

    });

    /*describe.skip("transaction", function() {

        it("executed queries must success", () => Promise.all(connections.map(async connection => {
            const repository = connection.getRepository(Blog);
            let blogs = await repository.find();
            blogs.should.be.eql([]);

            const blog = new Blog();
            blog.title = "hello blog title";
            blog.text = "hello blog text";
            await repository.save(blog);
            blogs.should.be.eql([]);

            blogs = await repository.find();
            blogs.length.should.be.equal(1);

            await repository.transaction(async () => {
                const promises: Promise<Blog>[] = [];
                for (let i = 0; i < 100; i++) {
                    const blog = new Blog();
                    blog.title = "hello blog";
                    blog.text = "hello blog #" + i;
                    blog.counter = i * 100;
                    promises.push(repository.save(blog));
                }
                await Promise.all(promises);

                blogs = await repository.find();
                blogs.length.should.be.equal(101);
            });

            blogs = await repository.find();
            blogs.length.should.be.equal(101);
        })));

        it("executed queries must rollback in the case if error in transaction", () => Promise.all(connections.map(async connection => {
            const repository = connection.getRepository(Blog);
            let blogs = await repository.find();
            blogs.should.be.eql([]);

            const blog = new Blog();
            blog.title = "hello blog title";
            blog.text = "hello blog text";
            await repository.save(blog);
            blogs.should.be.eql([]);

            blogs = await repository.find();
            blogs.length.should.be.equal(1);

            await repository.transaction(async () => {
                const promises: Promise<Blog>[] = [];
                for (let i = 0; i < 100; i++) {
                    const blog = new Blog();
                    blog.title = "hello blog";
                    blog.text = "hello blog #" + i;
                    blog.counter = i * 100;
                    promises.push(repository.save(blog));
                }
                await Promise.all(promises);

                blogs = await repository.find();
                blogs.length.should.be.equal(101);

                // now send the query that will crash all for us
                throw new Error("this error will cancel all persist operations");
            }).should.be.rejected;

            blogs = await repository.find();
            blogs.length.should.be.equal(1);
        })));

    });*/

});
