export const codeBlock = attrs => (...content) => ({
  type: 'codeBlock',
  attrs,
  content
});