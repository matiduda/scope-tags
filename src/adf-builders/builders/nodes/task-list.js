export const taskList = attrs => (...content) => ({
  type: 'taskList',
  attrs,
  content
});