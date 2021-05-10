import {Entity, OneToMany, OneToOne} from "../../../../src";
import {PrimaryGeneratedColumn} from "../../../../src";
import {Column} from "../../../../src";
import {Post} from "./Post";
import {Comment} from "./Comment";

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    surname: string;

    @OneToOne(type => Post, post => post.user)
    post: Post;

    @OneToMany(type => Comment, comment => comment.user)
    comments: Comment[];

    fullName?: string;
}
