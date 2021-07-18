// @ts-ignore : 'Column' is declared but its value is never read.
import { Country } from "./country.entity";
import { Entity } from "../../../../src/decorator/entity/Entity";
import { PrimaryGeneratedColumn } from "../../../../src/decorator/columns/PrimaryGeneratedColumn";

@Entity()
export class A {
  @PrimaryGeneratedColumn()
  id: number;
}
