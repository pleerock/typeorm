export interface SelectQuery {
    selection: string;
    aliasName?: string;
    virtual?: boolean;
    columnType?: string;
    mapToProperty?: string;
}
