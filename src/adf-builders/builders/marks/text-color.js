import { applyMark } from '../utils/apply-mark';
export const textColor = attrs => maybeNode => applyMark({
  type: 'textColor',
  attrs
}, maybeNode);