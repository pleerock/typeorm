import {Column, Entity} from "../../../../src";
import {PrimaryColumn} from "../../../../src/decorator/columns/PrimaryColumn";

@Entity()
export class Category {

    @PrimaryColumn()
    id: string;

    @Column()
    name: string;

    constructor(id?: string, name?: string) {
        if (id) this.id = id;
        if (name) this.name = name;
    }

}
