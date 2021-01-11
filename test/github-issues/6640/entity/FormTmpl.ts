import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from "../../../../src";
import {Form} from "./Form";

@Entity()
export class FormTmpl {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  origin: number;

  @Column()
  name: string;

  @OneToMany(() => Form, (form) => form.id)
  publicSettings: Form[];
}
