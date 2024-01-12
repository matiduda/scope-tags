export const taskItem = attrs => (...content) => ({
  type: 'taskItem',
  attrs,
  content
});