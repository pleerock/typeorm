import { Column, Entity, Generated, PrimaryGeneratedColumn } from "@typeorm/core";

@Entity()
export class Question {

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    @Generated("uuid")
    uuid: string;

    @Column()
    uuid2: string;

    @Column("varchar", {nullable: true})
    uuid3: string | null;

    @Column("varchar", {nullable: true})
    @Generated("uuid")
    uuid4: string | null;

}
