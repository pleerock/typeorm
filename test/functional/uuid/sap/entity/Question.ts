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

    @Column("nvarchar", {nullable: true})
    uuid3: string | null;

    @Column("nvarchar", {nullable: true})
    @Generated("uuid")
    uuid4: string | null;

}
