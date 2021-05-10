import {Column, Entity, ManyToOne, PrimaryGeneratedColumn} from "../../../../src";
import {User} from "./User";
import {Post} from "./Post";

@Entity()
export class Comment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    comment: string;

    @Column()
    userId: number;

    @ManyToOne(type => User, user => user.comments)
    user: User;

    @Column()
    postId: number;

    @ManyToOne(type => Post, post => post.comments)
    post: Post;

    opComment?: boolean;
}
