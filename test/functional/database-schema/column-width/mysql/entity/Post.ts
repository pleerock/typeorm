import { Column, Entity, PrimaryColumn } from "@typeorm/core";

@Entity()
export class Post {

    @PrimaryColumn()
    id: number;

    @Column("int", {width: 10})
    int: number;

    @Column("tinyint", {width: 2})
    tinyint: number;

    @Column("smallint", {width: 3})
    smallint: number;

    @Column("mediumint", {width: 9})
    mediumint: number;

    @Column("bigint", {width: 10})
    bigint: number;

}
