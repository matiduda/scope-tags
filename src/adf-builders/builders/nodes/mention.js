export const mention = attrs => ({
  type: 'mention',
  attrs: {
    accessLevel: '',
    ...attrs
  }
});