export const panel = attrs => (...content) => ({
  type: 'panel',
  attrs,
  content
});