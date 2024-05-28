// Copyright 2019 Atlassian Pty Ltd

export const doc = (...content: any) => ({
    type: 'doc',
    version: 1,
    content
});

export const expand = (attrs: any) => (...content: any) => ({
    type: 'expand',
    attrs,
    content
});

export const table = (...content: any) => ({
    type: 'table',
    content
});

export const tableHeader = (attrs?: any) => (...content: any) => {
    if (Array.isArray(content) && content.some(c => c?.content?.type === "paragraph" && c?.content?.text?.length === 0)) {
        throw new Error("[AdfUtils] tableHeader cannot have empty text field");
    }

    if (Array.isArray(content) && content.length === 0) {
        throw new Error("[AdfUtils] tableHeader cannot have empty content");
    }

    return {
        type: 'tableHeader',
        attrs,
        content: content
    }
};

export const tableRow = (content: any) => ({
    type: 'tableRow',
    content
});


/**
 * Careful, nestedExpand cannot be empty inside
 */
export const nestedExpand = (attrs: any) => (...content: any) => {
    // Check for empty text, as it won't be parsed by Jira
    // if (Array.isArray(content) && content.some(c => c?.content?.type === "text" && c?.content?.text?.length === 0)) {
    //     throw new Error("[AdfUtils] Nested expands cannot have empty text field");
    // }

    return {
        type: 'nestedExpand',
        attrs,
        content
    };
};

export const p = (...content: any) => ({
    type: 'paragraph',
    content: createTextNodes(content)
});

export const text = (text: any) => {
    // if (!text.length) {
    //     throw new Error("[AdfUtils] Text node cannot be empty");
    // }

    return {
        type: 'text',
        text
    }
};

export const strong = (maybeNode: any) => applyMark({
    type: 'strong'
}, maybeNode);

function createTextNodes(nodes: any) {
    return nodes.map(createTextFromString);
}

function createTextFromString(str: any) {
    return typeof str === 'string' ? text(str) : str;
}

export function applyMark(mark: any, maybeNode: any) {
    const node = typeof maybeNode === 'string' ? text(maybeNode) : maybeNode;

    if (isDuplicateMark(node, mark.type)) {
        // eslint-disable-next-line no-console
        console.error(duplicateMarkError(node, mark.type));
        return node;
    }

    node.marks = node.marks || [];
    node.marks.push(mark);
    return node;
}

export const link = (attrs: any) => (maybeNode: any) => applyMark({
    type: 'link',
    attrs
}, maybeNode);

function isDuplicateMark(node: any, type: any) {
    if (node.marks && node.marks.some((mark: any) => mark.type === type)) {
        return true;
    }

    return false;
}

function duplicateMarkError(node: any, type: any) {
    return `Mark with the same name '${type}' already exists on a node: ${JSON.stringify(node)}`;
}