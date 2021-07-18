import { ObjectId } from "mongodb";
import {Entity} from "../../../../src/decorator/entity/Entity";
import {ObjectIdColumn} from "../../../../src/decorator/columns/ObjectIdColumn";
import {Column} from "../../../../src/decorator/columns/Column";

@Entity()
export class User {

    @ObjectIdColumn()
    id: ObjectId;

    @Column()
    name: string;

}
