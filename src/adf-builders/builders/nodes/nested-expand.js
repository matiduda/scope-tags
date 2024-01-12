export const nestedExpand = attrs => (...content) => ({
  type: 'nestedExpand',
  attrs,
  content
});