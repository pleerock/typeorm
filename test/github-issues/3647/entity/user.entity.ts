import { Entity, PrimaryGeneratedColumn } from "../../../../src";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    public id: number;
}
