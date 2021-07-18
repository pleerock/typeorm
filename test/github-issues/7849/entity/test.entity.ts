import {Column, Entity, PrimaryGeneratedColumn} from "../../../../src";

@Entity("test")
export class TestEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;
}
