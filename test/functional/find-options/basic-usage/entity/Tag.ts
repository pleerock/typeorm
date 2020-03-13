import {Column, Entity, ManyToMany, PrimaryGeneratedColumn} from "../../../../../src";
import {Post} from "./Post";

@Entity()
export class Tag {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @ManyToMany(() => Post, post => post.tags)
    posts: Post[];

}