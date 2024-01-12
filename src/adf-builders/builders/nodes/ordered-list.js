export const orderedList = attrs => (...content) => ({
  type: 'orderedList',
  attrs,
  content
});