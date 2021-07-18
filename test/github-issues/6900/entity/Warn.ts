import { ObjectId } from "mongodb";
import { Entity, ObjectIdColumn, Column } from "../../../../src";

@Entity("warnings")
export class Warn {
    @ObjectIdColumn()
    id!: ObjectId

    @Column()
    guild!: string;

    @Column()
    user!: string;

    @Column()
    moderator!: string;

    @Column()
    reason!: string;

    @Column()
    createdAt!: Date;
}
