import { PrimaryGeneratedColumn } from "../../../../src/decorator/columns/PrimaryGeneratedColumn";
import { Entity } from "../../../../src/decorator/entity/Entity";
import { OneToMany } from "../../../../src/decorator/relations/OneToMany";
import { Bar } from "./Bar";
import { Column } from "../../../../src";

@Entity()
export class Foo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: false })
  hasStuff: boolean;

  @OneToMany(() => Bar, (bar: Bar) => bar.foo, {
    cascade: true
  })
  bars: Bar[];
}
