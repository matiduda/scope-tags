export type Tag = {
    name: string,
    categoryName: string
};

export type TagCategory = {
    name: string;
    exclusive: boolean;
    tags: Array<Tag>
    parentCategory: string,
    childCategories: Array<string>,
};