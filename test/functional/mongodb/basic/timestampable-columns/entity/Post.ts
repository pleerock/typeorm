import { ObjectId } from "mongodb";
import { Entity } from "../../../../../../src/decorator/entity/Entity";
import { Column } from "../../../../../../src/decorator/columns/Column";
import { ObjectIdColumn } from "../../../../../../src/decorator/columns/ObjectIdColumn";
import { CreateDateColumn } from "../../../../../../src/decorator/columns/CreateDateColumn";
import { UpdateDateColumn } from "../../../../../../src/decorator/columns/UpdateDateColumn";

@Entity()
export class Post {

    @ObjectIdColumn()
    id: ObjectId;

    @Column()
    message: string;

    @Column()
    @CreateDateColumn()
    createdAt: Date;

    @Column()
    @UpdateDateColumn()
    updatedAt: Date;
}
