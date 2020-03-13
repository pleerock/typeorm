import {Index} from "../../../../src/decorator/Index";
import {Entity} from "../../../../src/decorator/entity/Entity";
import {ManyToOne} from "../../../../src/decorator/relations/ManyToOne";
import {JoinColumn} from "../../../../src/decorator/relations/JoinColumn";
import {Column} from "../../../../src/decorator/columns/Column";
import {Message} from "./Message";
import {Locale} from "./Locale";
import {PrimaryColumn} from "../../../../src/decorator/columns/PrimaryColumn";

@Entity()
@Index(["locale", "message"], { unique: true })
export class Translation {

    @PrimaryColumn()
    localeCode: string;

    @PrimaryColumn()
    messageId: number;

    @ManyToOne(() => Locale)
    @JoinColumn()
    locale: Locale;

    @ManyToOne(() => Message)
    @JoinColumn()
    message: Message;

    @Column("text")
    text: string;
}