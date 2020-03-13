import { CreateDateColumn, Entity, PrimaryGeneratedColumn, Column } from "../../../../src";
@Entity()
export class Dummy {
    @PrimaryGeneratedColumn({ unsigned: true })
    id: number;

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)" })
    from: Date;

    @Column({ type: "timestamp", default: () => null, nullable: true })
    to: Date;
}
