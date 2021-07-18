import { ObjectId } from "mongodb";
import {Entity} from "../../../../../../src/decorator/entity/Entity";
import {Column} from "../../../../../../src/decorator/columns/Column";
import {ObjectIdColumn} from "../../../../../../src/decorator/columns/ObjectIdColumn";
import {Index} from "../../../../../../src/decorator/Index";
import {Information} from "./Information";

@Entity()
@Index("info_description", ["info.description"])
export class Post {

    @ObjectIdColumn()
    id: ObjectId;

    @Column()
    title: string;

    @Column()
    name: string;

    @Column(() => Information)
    info: Information;

}
