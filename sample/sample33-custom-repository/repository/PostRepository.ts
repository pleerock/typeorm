import {Post} from "../entity/Post";
import {Sample33CustomRepositoryConnection} from "../connection";

export const PostRepository = Sample33CustomRepositoryConnection
    .getRepository(Post)
    .extend({

        findMyPost() {
            return this.findOne();
        }

    });
