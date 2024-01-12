export const tableHeader = attrs => (...content) => ({
  type: 'tableHeader',
  attrs,
  content: content
});