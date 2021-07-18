// @ts-ignore : 'Column' is declared but its value is never read.
import { Entity } from "../../../../src/decorator/entity/Entity";
import { PrimaryColumn } from "../../../../src/decorator/columns/PrimaryColumn";

@Entity()
export class B {
  @PrimaryColumn()
  fooCode: string;

  @PrimaryColumn()
  barId: number;
}
