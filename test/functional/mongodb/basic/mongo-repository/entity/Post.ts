import { ObjectId } from "mongodb";
import {Entity} from "../../../../../../src/decorator/entity/Entity";
import {Column} from "../../../../../../src/decorator/columns/Column";
import {ObjectIdColumn} from "../../../../../../src/decorator/columns/ObjectIdColumn";

@Entity()
export class Post {

    @ObjectIdColumn()
    id: ObjectId;

    @Column()
    title: string;

    @Column()
    text: string;

    // @Column(() => Counters)
    // counters: Counters;

}
