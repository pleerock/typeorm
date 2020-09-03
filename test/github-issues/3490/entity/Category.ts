import { BaseEntity, PrimaryGeneratedColumn, Column, OneToMany, Entity } from "../../../../src";
import Post from "./Post";

@Entity()
export default class Category extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @OneToMany(() => Post, post => post.category)
    posts: Post[];
}
