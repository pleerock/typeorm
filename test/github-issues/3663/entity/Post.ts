import { Entity, OneToMany, ManyToOne } from "../../../../src";
import { PrimaryGeneratedColumn } from "../../../../src";

@Entity()
export class Post {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToMany(type => Post, post => post.parentPost, { eager: true })
    public childPosts: Post[];

    @ManyToOne(type => Post, post => post.childPosts, { nullable: true })
    public parentPost: Post;
}
