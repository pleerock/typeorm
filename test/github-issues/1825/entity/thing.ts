import { Column, Entity, PrimaryGeneratedColumn } from "@typeorm/core";

export class EmbeddedInThing {
    @Column()
    public someSeriouslyLongFieldNameFirst: number;

    @Column()
    public someSeriouslyLongFieldNameSecond: number;
}

@Entity()
export class Thing {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column(type => EmbeddedInThing)
    public embeddedThing: EmbeddedInThing;
}
