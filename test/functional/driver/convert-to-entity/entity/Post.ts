import {Entity} from "../../../../../src";
import {Column} from "../../../../../src";
import {PrimaryColumn} from "../../../../../src";

@Entity()
export class Post {

    @PrimaryColumn()
    id: number;

    @Column({nullable: true})
    isNew: boolean;
}
