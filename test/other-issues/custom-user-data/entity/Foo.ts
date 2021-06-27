import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  DeleteDateColumn,
} from "../../../../src";

@Entity("foo")
export class Foo {
  @PrimaryGeneratedColumn("increment") public id: number;

  @Column()
  public name: string;

  @DeleteDateColumn()
  delete_date?: string;
}
