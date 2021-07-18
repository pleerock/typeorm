import {Entity} from "../../../../../../src/decorator/entity/Entity";
import {Column} from "../../../../../../src/decorator/columns/Column";
import {ObjectIdColumn} from "../../../../../../src/decorator/columns/ObjectIdColumn";
import {Counters} from "./Counters";
import { Tags } from "./Tags";
import { ObjectId } from "mongodb";

@Entity()
export class Post {

    @ObjectIdColumn()
    id: ObjectId;

    @Column()
    title: string;

    @Column()
    text: string;

    @Column(type => Counters)
    counters?: Counters;

    @Column(type => Tags)
    tags?: Tags[];

}
