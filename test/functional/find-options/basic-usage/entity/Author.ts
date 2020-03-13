import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from "../../../../../src";
import {Photo} from "./Photo";

@Entity()
export class Author {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column()
    age: number;

    @OneToMany(() => Photo, photo => photo.author)
    photos: Photo[];

}