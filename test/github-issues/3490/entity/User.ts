import { BaseEntity, PrimaryGeneratedColumn, Column, OneToMany, Entity } from "../../../../src";
import Post from "./Post";

@Entity()
export default class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    dateBorn: Date;

    @OneToMany(() => Post, post => post.author)
    posts: Post[];
}
