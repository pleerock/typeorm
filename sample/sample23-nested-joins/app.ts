import "reflect-metadata";
import {createConnection, CreateConnectionOptions} from "../../src/backend";
import {Post} from "./entity/Post";
import {Author} from "./entity/Author";
import {Category} from "./entity/Category";

const options: CreateConnectionOptions = {
    driver: "mysql",
    connection: {
        host: "192.168.99.100",
        port: 3306,
        username: "root",
        password: "admin",
        database: "test",
        autoSchemaCreate: true,
        logging: {
            logOnlyFailedQueries: true,
            logFailedQueryError: true
        }
    },
    entities: [Post, Author, Category]
};

createConnection(options).then(connection => {

    let postRepository = connection.getRepository(Post);
    
    let category1 = new Category();
    category1.name = "category #1";
    
    let category2 = new Category();
    category2.name = "category #2";
    
    let post = new Post();
    post.text = "Hello how are you?";
    post.title = "hello";
    post.categories = [category1, category2];

    let author = new Author();
    author.name = "Umed";
    post.author = author;

    let author2 = new Author();
    author2.name = "Bakhrom";

    postRepository
        .persist(post)
        .then(post => {
            return postRepository
                .createQueryBuilder("post")
                .leftJoin("post.categories", "categories")
                .leftJoin("categories.author", "author")
                .where("post.id=1")
                .getSingleResult();
        })
        .then(loadedPost => {
            console.log("loadedPosts: ", loadedPost);
            console.log("Lets update a post - add a new category and change author");

            let category3 = new Category();
            category3.name = "category #3";
            post.categories.push(category3);

            post.author = author2;
            
            return postRepository.persist(post);
        })
        .then(updatedPost => {
            return postRepository
                .createQueryBuilder("post")
                .leftJoinAndSelect("post.author", "author")
                .leftJoinAndSelect("post.categories", "categories")
                .where("post.id=:id", { id: post.id })
                .getSingleResult();
        })
        .then(loadedPost => {
            console.log(loadedPost);
            console.log("Lets update a post - return old author back:");

            console.log("updating with: ", author);
            loadedPost.title = "Umed's post";
            loadedPost.author = author;
            return postRepository.persist(loadedPost);
        })
        .then(updatedPost => {
            return postRepository
                .createQueryBuilder("post")
                .leftJoinAndSelect("post.author", "author")
                .leftJoinAndSelect("post.categories", "categories")
                .where("post.id=:id", { id: post.id })
                .getSingleResult();
        })
        .then(loadedPost => {
            console.log(loadedPost);
            console.log("Now lets remove post's author:");
            post.author = null;
            return postRepository.persist(post);
        })
        .then(updatedPost => {
            return postRepository
                .createQueryBuilder("post")
                .leftJoinAndSelect("post.author", "author")
                .leftJoinAndSelect("post.categories", "categories")
                .where("post.id=:id", { id: post.id })
                .getSingleResult();
        })
        .then(loadedPost => {
            console.log(loadedPost);
            console.log("Finally bakhrom's post:");
            post.author = author2;
            return postRepository.persist(post);
        })
        .then(updatedPost => {
            return postRepository
                .createQueryBuilder("post")
                .leftJoinAndSelect("post.author", "author")
                .leftJoinAndSelect("post.categories", "categories")
                .where("post.id=:id", { id: post.id })
                .getSingleResult();
        })
        .then(loadedPost => {
            console.log(loadedPost);
        })
        .catch(error => console.log(error.stack));

}, error => console.log("Cannot connect: ", error));