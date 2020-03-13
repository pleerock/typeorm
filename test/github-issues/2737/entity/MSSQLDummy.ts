import { CreateDateColumn, Column, Entity, PrimaryGeneratedColumn } from "../../../../src";
@Entity()
export class Dummy {
    @PrimaryGeneratedColumn({ unsigned: true })
    id: number;

    @CreateDateColumn({ type: "int", default: () => "5" })
    from: number;

    @Column({ type: "int", default: () => null, nullable: true })
    to: number;
}
