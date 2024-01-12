export const bodiedExtension = attrs => (...content) => ({
  type: 'bodiedExtension',
  attrs,
  content
});