export const mediaSingle = attrs => content => ({
  type: 'mediaSingle',
  attrs,
  content: Array.isArray(content) ? content : [content]
});