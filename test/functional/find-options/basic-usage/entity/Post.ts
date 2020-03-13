import {Column, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn} from "../../../../../src";
import {Tag} from "./Tag";
import {Author} from "./Author";
import {Counters} from "./Counters";

@Entity()
export class Post {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column()
    text: string;

    @ManyToMany(() => Tag, tag => tag.posts)
    @JoinTable()
    tags: Tag[];

    @ManyToOne(() => Author)
    author: Author;

    @Column(() => Counters)
    counters: Counters;

}