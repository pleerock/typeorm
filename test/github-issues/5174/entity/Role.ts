import { Entity, OneToMany, PrimaryColumn } from "@typeorm/core";
import { User } from "./User";

@Entity()
export class Role {

    @PrimaryColumn()
    id: string;

    @OneToMany(_ => User, user => user.role, {cascade: true})
    users: User[];

}
