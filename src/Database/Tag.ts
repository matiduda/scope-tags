export type Tag = {
    id: number,
    name: string,
};

export type TagCategory = {
    id: number,
    name: string;
    exclusive: boolean;
    tags: Array<Tag>
};