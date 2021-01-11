import {Column, Entity, ManyToOne, PrimaryGeneratedColumn} from "../../../../src";
import {FormTmpl} from "./FormTmpl";

export class ExtraSetting {
  someStr: string;
  someNb: number;
}

@Entity()
export class Form {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  formTmplId: number;

  @ManyToOne(() => FormTmpl, (formTmpl) => formTmpl.id, {
    eager: true,
  })
  formTmpl: FormTmpl;

  @Column()
  settings: string;

  // JSONB column
  @Column("jsonb", {nullable: true})
  extraSettings?: ExtraSetting;
}
