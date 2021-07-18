import { Entity } from "../../../../src/decorator/entity/Entity";
import { PrimaryColumn } from "../../../../src/decorator/columns/PrimaryColumn";
import { ManyToOne } from "../../../../src/decorator/relations/ManyToOne";
import { JoinColumn } from "../../../../src/decorator/relations/JoinColumn";
import { A } from "./a";
import { B } from "./b";

@Entity()
export class C {
  @PrimaryColumn()
  id: number;

  @PrimaryColumn()
  barId: number;

  @PrimaryColumn()
  fooCode: string;

  @ManyToOne(() => A)
  @JoinColumn({ name: "barId", referencedColumnName: "id" })
  a: A;

  @ManyToOne(() => B)
  @JoinColumn([
    { name: "fooCode", referencedColumnName: "fooCode" },
    { name: "barId", referencedColumnName: "barId" },
  ])
  b: B;
}
