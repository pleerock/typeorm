import {Entity} from "../../../../src/decorator/entity/Entity";
import {PrimaryGeneratedColumn} from "../../../../src/decorator/columns/PrimaryGeneratedColumn";
import {Column} from "../../../../src/decorator/columns/Column";

@Entity()
export class Post {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        name: 'incr',
        nullable: true,
        default: 10,
    })
    incr: number;

    @Column()
    title: string;

}
