export const status = (attrs = {
  text: 'In progress',
  color: 'blue'
}) => ({
  type: 'status',
  attrs
});