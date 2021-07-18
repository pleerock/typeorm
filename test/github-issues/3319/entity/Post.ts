import {Entity, PrimaryColumn} from "../../../../src";

@Entity({name: "test_post"})
export class Post {
    @PrimaryColumn({name: "post_id"})
    id: number;
}
