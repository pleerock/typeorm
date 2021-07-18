import { ObjectId } from "mongodb";
import {Entity} from "../../../../../../src/decorator/entity/Entity";
import {Column} from "../../../../../../src/decorator/columns/Column";
import {ObjectIdColumn} from "../../../../../../src/decorator/columns/ObjectIdColumn";
import {Index} from "../../../../../../src/decorator/Index";

@Entity()
@Index(["title", "name"])
@Index(() => ({ title: -1, name: -1, count: 1 }))
@Index("title_name_count", () => ({ title: 1, name: 1, count: 1 }))
@Index("title_name_count_reversed", () => ({ title: -1, name: -1, count: -1 }))
@Index("count_in_background", () => ({ count: -1 }), {background: true})
@Index("count_expire", () => ({ title: -1 }), {expireAfterSeconds: 3600})
export class Post {

    @ObjectIdColumn()
    id: ObjectId;

    @Column()
    @Index()
    title: string;

    @Column()
    @Index()
    name: string;

    @Column()
    @Index({ unique: true })
    count: number;

}
