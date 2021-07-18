import { ObjectId } from "mongodb";
import {Entity} from "../../../../src/decorator/entity/Entity";
import {ObjectIdColumn} from "../../../../src/decorator/columns/ObjectIdColumn";
import {Column} from "../../../../src/decorator/columns/Column";
import {Event} from "./Event";

@Entity()
export class User {

    @ObjectIdColumn()
    id: ObjectId;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column()
    age: number;

    @Column(type => Event)
    events: Event[];

}
