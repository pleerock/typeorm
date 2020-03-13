import {Column, Entity, ManyToOne, PrimaryGeneratedColumn} from "../../../../../src";
import {Author} from "./Author";

@Entity()
export class Photo {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    filename: string;

    @Column()
    description: string;

    @ManyToOne(() => Author, author => author.photos)
    author: Author;

}