import { PrimaryGeneratedColumn } from "../../../../src/decorator/columns/PrimaryGeneratedColumn";
import { Entity } from "../../../../src/decorator/entity/Entity";
import { ManyToOne } from "../../../../src/decorator/relations/ManyToOne";
import { Foo } from "./Foo";
import { Column } from "../../../../src";

@Entity()
export class Bar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: false })
  isTrapazoidal: boolean;

  @ManyToOne(() => Foo, (foo: Foo) => foo.bars, {
    nullable: false
  })
  foo: Foo;
}
