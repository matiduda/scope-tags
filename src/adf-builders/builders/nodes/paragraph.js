import { createTextNodes } from '../utils/create-text-nodes';
export const paragraph = (...content) => ({
  type: 'paragraph',
  content: createTextNodes(content)
});