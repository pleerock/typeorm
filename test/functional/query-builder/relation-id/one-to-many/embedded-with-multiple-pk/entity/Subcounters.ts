import { Column, OneToMany, PrimaryColumn } from "@typeorm/core";
import { User } from "./User";

export class Subcounters {

    @PrimaryColumn()
    version: number;

    @Column()
    watches: number;

    @OneToMany(type => User, user => user.post)
    watchedUsers: User[];

    watchedUserIds: number[];

}
