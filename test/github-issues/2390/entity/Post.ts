import {Column, Entity, PrimaryColumn} from "../../../../src";
import {ValueTransformer} from "../../../../src/decorator/options/ValueTransformer";

class Transformer implements ValueTransformer {

    to(value: string): string {
        // here we expect string only, not "In" FindOperator
        return value.substring(1);
    }

    from(value: string): string {
        return "s" + value;
    }

}

@Entity()
export class Post {

    @PrimaryColumn({ type: "varchar", transformer: new Transformer() })
    id: string;

    @Column({ nullable: true })
    title: string;

    constructor(id: string) {
        this.id = id;
    }

}
