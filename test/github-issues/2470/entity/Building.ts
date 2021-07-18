import {BaseEntity, Column, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "../../../../src";

import { Constructor } from "./Constructor";
import { Entity } from "../../../../src/decorator/entity/Entity";

@Entity("building")
export class Building  extends BaseEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public city: string;

  @JoinColumn({ name: "constructor_id" })
  @ManyToOne(() => Constructor, { eager: true })
  public "constructor"?: Constructor;
}
