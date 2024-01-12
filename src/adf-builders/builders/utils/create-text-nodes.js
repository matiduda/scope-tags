import { text } from '../nodes/text';
export function createTextNodes(nodes) {
  return nodes.map(createTextFromString);
}
export function createTextFromString(str) {
  return typeof str === 'string' ? text(str) : str;
}