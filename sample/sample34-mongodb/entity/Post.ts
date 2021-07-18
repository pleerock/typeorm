import {Column, Entity} from "../../../src/index";
import {ObjectIdColumn} from "../../../src/decorator/columns/ObjectIdColumn";
import { ObjectId } from "mongodb";

@Entity("sample34_post")
export class Post {

    @ObjectIdColumn()
    id: ObjectId;

    @Column()
    title: string;

    @Column()
    text: string;

    @Column("int", {
        nullable: false
    })
    likesCount: number;

}
