import "reflect-metadata";
import * as chai from "chai";
import {expect} from "chai";
import {Connection} from "../../../../src/connection/Connection";
import {Repository} from "../../../../src/repository/Repository";
import {Post} from "./entity/Post";
import {Category} from "./entity/Category";
import {CreateConnectionOptions} from "../../../../src/connection-manager/CreateConnectionOptions";
import {createConnection} from "../../../../src/backend";
import {CategoryMetadata} from "./entity/CategoryMetadata";
import {setupConnection} from "../../../utils/test-utils";

chai.should();
chai.use(require("sinon-chai"));
chai.use(require("chai-as-promised"));

describe("persistence > custom-column-names", function() {

    // -------------------------------------------------------------------------
    // Configuration
    // -------------------------------------------------------------------------

    // connect to db
    let connection: Connection;
    before(setupConnection(con => connection = con, [Post, Category, CategoryMetadata]));
    after(() => connection.close());

    // clean up database before each test
    function reloadDatabase() {
        return connection.syncSchema(true)
            .catch(e => console.log("Error during schema re-creation: ", e));
    }

    let postRepository: Repository<Post>;
    let categoryRepository: Repository<Category>;
    let metadataRepository: Repository<CategoryMetadata>;
    before(function() {
        postRepository = connection.getRepository(Post);
        categoryRepository = connection.getRepository(Category);
        metadataRepository = connection.getRepository(CategoryMetadata);
    });

    // -------------------------------------------------------------------------
    // Specifications
    // -------------------------------------------------------------------------
    
    describe("attach exist entity to exist entity with many-to-one relation", function() {
        let newPost: Post, newCategory: Category, loadedPost: Post;

        before(reloadDatabase);

        // save a new category
        before(function () {
            newCategory = categoryRepository.create();
            newCategory.name = "Animals";
            return categoryRepository.persist(newCategory);
        });

        // save a new post
        before(function() {
            newPost = postRepository.create();
            newPost.title = "All about animals";
            return postRepository.persist(newPost);
        });

        // attach category to post and save it
        before(function() {
            newPost.category = newCategory;
            return postRepository.persist(newPost);
        });

        // load a post
        before(function() {
            return postRepository
                .findOneById(1, { alias: "post", leftJoinAndSelect: { category: "post.category" } })
                .then(post => loadedPost = post);
        });

        it("should contain attached category", function () {
            expect(loadedPost).not.to.be.empty;
            expect(loadedPost.category).not.to.be.empty;
            expect(loadedPost.categoryId).not.to.be.empty;
        });

    });

    describe("attach new entity to exist entity with many-to-one relation", function() {
        let newPost: Post, newCategory: Category, loadedPost: Post;

        before(reloadDatabase);

        // save a new category
        before(function () {
            newCategory = categoryRepository.create();
            newCategory.name = "Animals";
            return categoryRepository.persist(newCategory);
        });

        // save a new post and attach category
        before(function() {
            newPost = postRepository.create();
            newPost.title = "All about animals";
            newPost.category = newCategory;
            return postRepository.persist(newPost);
        });

        // load a post
        before(function() {
            return postRepository
                .findOneById(1, { alias: "post", leftJoinAndSelect: { category: "post.category" } })
                .then(post => loadedPost = post);
        });

        it("should contain attached category", function () {
            expect(loadedPost).not.to.be.empty;
            expect(loadedPost.category).not.to.be.empty;
            expect(loadedPost.categoryId).not.to.be.empty;
        });

    });

    describe("attach new entity to new entity with many-to-one relation", function() {
        let newPost: Post, newCategory: Category, loadedPost: Post;

        before(reloadDatabase);

        // save a new category, post and attach category to post
        before(function () {
            newCategory = categoryRepository.create();
            newCategory.name = "Animals";
            newPost = postRepository.create();
            newPost.title = "All about animals";
            newPost.category = newCategory;
            return postRepository.persist(newPost);
        });

        // load a post
        before(function() {
            return postRepository
                .findOneById(1, { alias: "post", leftJoinAndSelect: { category: "post.category" } })
                .then(post => loadedPost = post);
        });

        it("should contain attached category", function () {
            expect(loadedPost).not.to.be.empty;
            expect(loadedPost.category).not.to.be.empty;
            expect(loadedPost.categoryId).not.to.be.empty;
        });

    });

    describe("attach exist entity to exist entity with one-to-one relation", function() {
        let newPost: Post, newCategory: Category, newMetadata: CategoryMetadata, loadedPost: Post;

        before(reloadDatabase);

        // save a new post
        before(function() {
            newPost = postRepository.create();
            newPost.title = "All about animals";
            return postRepository.persist(newPost);
        });

        // save a new category
        before(function () {
            newCategory = categoryRepository.create();
            newCategory.name = "Animals";
            return categoryRepository.persist(newCategory);
        });

        // save a new metadata
        before(function() {
            newMetadata = metadataRepository.create();
            newMetadata.keyword = "animals";
            return metadataRepository.persist(newMetadata);
        });

        // attach metadata to category and category to post and save it
        before(function() {
            newCategory.metadata = newMetadata;
            newPost.category = newCategory;
            return postRepository.persist(newPost);
        });

        // load a post
        before(function() {
            return postRepository
                .findOneById(1, { alias: "post", leftJoinAndSelect: { category: "post.category", metadata: "category.metadata" } })
                .then(post => loadedPost = post);
        });

        it("should contain attached category and metadata in the category", function () {
            expect(loadedPost).not.to.be.empty;
            expect(loadedPost.category).not.to.be.empty;
            expect(loadedPost.categoryId).not.to.be.empty;
            expect(loadedPost.category.metadata).not.to.be.empty;
            expect(loadedPost.category.metadataId).not.to.be.empty;
        });

    });

    describe("attach new entity to exist entity with one-to-one relation", function() {
        let newPost: Post, newCategory: Category, newMetadata: CategoryMetadata, loadedPost: Post;

        before(reloadDatabase);

        // save a new post
        before(function() {
            newPost = postRepository.create();
            newPost.title = "All about animals";
            return postRepository.persist(newPost);
        });

        // save a new category and new metadata
        before(function () {
            newMetadata = metadataRepository.create();
            newMetadata.keyword = "animals";
            newCategory = categoryRepository.create();
            newCategory.name = "Animals";
            newCategory.metadata = newMetadata;
            return categoryRepository.persist(newCategory);
        });

        // attach metadata to category and category to post and save it
        before(function() {
            newPost.category = newCategory;
            return postRepository.persist(newPost);
        });

        // load a post
        before(function() {
            return postRepository
                .findOneById(1, { alias: "post", leftJoinAndSelect: { category: "post.category", metadata: "category.metadata" } })
                .then(post => loadedPost = post);
        });

        it("should contain attached category and metadata in the category", function () {
            expect(loadedPost).not.to.be.empty;
            expect(loadedPost.category).not.to.be.empty;
            expect(loadedPost.categoryId).not.to.be.empty;
            expect(loadedPost.category.metadata).not.to.be.empty;
            expect(loadedPost.category.metadataId).not.to.be.empty;
        });

    });

});