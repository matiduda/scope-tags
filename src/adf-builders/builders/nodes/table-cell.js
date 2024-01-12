export const tableCell = attrs => (...content) => ({
  type: 'tableCell',
  attrs,
  content
});