export function isDuplicateMark(node, type) {
  if (node.marks && node.marks.some(mark => mark.type === type)) {
    return true;
  }

  return false;
}
export function duplicateMarkError(node, type) {
  return `Mark with the same name '${type}' already exists on a node: ${JSON.stringify(node)}`;
}