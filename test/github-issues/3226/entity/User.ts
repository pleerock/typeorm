import { Column, PrimaryGeneratedColumn, Entity } from "../../../../src";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;
}
