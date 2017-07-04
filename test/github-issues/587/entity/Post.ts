import {Entity} from "../../../../src/decorator/entity/Entity";
import {PrimaryGeneratedColumn} from "../../../../src/decorator/columns/PrimaryGeneratedColumn";
import {Column} from "../../../../src/decorator/columns/Column";
import {Index} from "../../../../src/decorator/Index";
import {ManyToOne} from "../../../../src/Index";
import {Tag} from "./Tag";

@Index(["tag", "c", "b", "a"])
@Index(["a", "b", "c", "tag"])
@Index(["b", "tag", "c"])
@Index(["c", "a"])
@Entity("Posts")
export class Post {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    a: string;

    @Column()
    b: string;

    @Column()
    c: string;

    @ManyToOne(type => Tag)
    tag: Tag;
}