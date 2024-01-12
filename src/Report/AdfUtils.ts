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

export const tableHeader = (attrs?: any) => (...content: any) => ({
    type: 'tableHeader',
    attrs,
    content: content
});

export const tableRow = (content: any) => ({
    type: 'tableRow',
    content
});

export const nestedExpand = (attrs: any) => (...content: any) => ({
    type: 'nestedExpand',
    attrs,
    content
});

export const p = (...content: any) => ({
    type: 'paragraph',
    content: createTextNodes(content)
});

export const text = (text: any) => ({
    type: 'text',
    text
});

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

function isDuplicateMark(node: any, type: any) {
    if (node.marks && node.marks.some((mark: any) => mark.type === type)) {
        return true;
    }

    return false;
}

function duplicateMarkError(node: any, type: any) {
    return `Mark with the same name '${type}' already exists on a node: ${JSON.stringify(node)}`;
}