import {Entity} from "../../../../src/decorator/entity/Entity";
import { PrimaryGeneratedColumn, Column, ManyToOne } from "../../../../src";
import { User } from "./user.entity";

@Entity()
export class Photo {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column("int", { nullable: true })
    public userId: number;

    @ManyToOne(type => User)
    public user: User;

}

