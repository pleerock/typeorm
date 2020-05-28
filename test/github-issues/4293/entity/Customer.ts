import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    ValueTransformer,
} from "../../../../src";

class TrimTransformer implements ValueTransformer {
    to(value?: string) {
        return typeof value === "string" ? value.trim() : value;
    }

    from(value?: string) {
        return typeof value === "string" ? value.trim() : value;
    }
}

@Entity()
export class Customer {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        type: "varchar",
        nullable: false,
        transformer: new TrimTransformer(),
    })
    firstName: string;

    @Column({
        type: "varchar",
        nullable: false,
        transformer: new TrimTransformer(),
    })
    lastName: string;
}
