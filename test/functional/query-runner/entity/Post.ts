import { Entity } from "../../../../src/decorator/entity/Entity";
import { Column } from "../../../../src/decorator/columns/Column";
import { Unique } from "../../../../src/decorator/Unique";
import { PrimaryColumn } from "../../../../src/decorator/columns/PrimaryColumn";
import { Check } from "../../../../src/decorator/Check";
import { Exclusion } from "../../../../src/decorator/Exclusion";

@Entity()
@Unique(["text", "tag"], { deferrable: 'INITIALLY DEFERRED' })
@Exclusion(`USING gist ("name" WITH =)`)
@Check(`"version" < 999`)
export class Post {

    @PrimaryColumn()
    id: number;

    @Column({ unique: true })
    version: number;

    @Column({ default: "My post" })
    name: string;

    @Column()
    text: string;

    @Column()
    tag: string;

}
