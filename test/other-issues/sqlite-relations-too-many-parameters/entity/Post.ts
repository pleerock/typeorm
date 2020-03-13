import {Column, Entity, ManyToMany, PrimaryGeneratedColumn} from "../../../../src";
import {JoinTable} from "../../../../src/decorator/relations/JoinTable";
import {Category} from "./Category";

@Entity()
export class Post {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @ManyToMany(() => Category)
    @JoinTable()
    categories: Category[];

    constructor(title?: string) {
        if (title) this.title = title;
    }

}