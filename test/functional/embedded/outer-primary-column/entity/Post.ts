import { Column, Entity } from "@typeorm/core";
import { Counters } from "./Counters";

@Entity()
export class Post {

    @Column()
    title: string;

    @Column()
    text: string;

    @Column(() => Counters, {prefix: "cnt"})
    counters: Counters;

}
