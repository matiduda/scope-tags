export const expand = attrs => (...content) => ({
  type: 'expand',
  attrs,
  content
});