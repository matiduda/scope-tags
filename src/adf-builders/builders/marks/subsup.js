import { applyMark } from '../utils/apply-mark';
export const subsup = attrs => maybeNode => applyMark({
  type: 'subsup',
  attrs
}, maybeNode);