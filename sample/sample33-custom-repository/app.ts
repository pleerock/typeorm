import "reflect-metadata";
import {Post} from "./entity/Post";
import {Author} from "./entity/Author";
import {PostRepository} from "./repository/PostRepository";
import {User} from "./entity/User";
import {Sample33CustomRepositoryConnection} from "./connection";

// testing dynamic options set
Sample33CustomRepositoryConnection.setOptions({
    entities: [Post, Author, User],
});

Sample33CustomRepositoryConnection.connect().then(async () => {

    const post = PostRepository.create();
    post.title = "Hello Custom Repositories!";

    await PostRepository.save(post);

    const loadedPost = await PostRepository.findMyPost();
    console.log("Post persisted! Loaded post: ", loadedPost);

}).catch(error => console.log("Error: ", error));
