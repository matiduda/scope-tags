const { AutoComplete } = require('enquirer');

export const tagSelectionPrompt = new AutoComplete({
  name: 'flavor',
  message: 'Pick your favorite flavor',
  limit: 10,
  initial: 2,
  choices: [
    'Almond',
    'Apple',
    'Banana',
    'Blackberry',
    'Blueberry',
    'Cherry',
    'Chocolate',
    'Cinnamon',
    'Coconut',
    'Cranberry',
    'Grape',
    'Nougat',
    'Orange',
    'Pear',
    'Pineapple',
    'Raspberry',
    'Strawberry',
    'Vanilla',
    'Watermelon',
    'Wintergreen'
  ]
});