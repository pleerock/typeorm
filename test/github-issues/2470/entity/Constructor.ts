import { BaseEntity, Column, PrimaryGeneratedColumn } from "../../../../src";

import { Entity } from "../../../../src/decorator/entity/Entity";

@Entity("constructor")
export class Constructor extends BaseEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public name: string;
}
