import {Column, Entity, PrimaryGeneratedColumn} from "../../../../../src";

@Entity()
export class Post {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column()
    active: boolean = true;

    constructor(title: string) {
        this.title = title;
    }

}