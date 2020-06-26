import { Column, Entity, PrimaryGeneratedColumn } from "@typeorm/core";
import { Counters } from "./Counters";

@Entity()
export class Post {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column()
    text: string;

    @Column(type => Counters)
    counters: Counters;

    @Column(type => Counters, {prefix: "testCounters"})
    otherCounters: Counters;

    @Column(type => Counters, {prefix: ""})
    countersWithoutPrefix: Counters;

}
