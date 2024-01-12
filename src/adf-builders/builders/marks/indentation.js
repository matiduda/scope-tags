import { applyMark } from '../utils/apply-mark';
export const indentation = attrs => maybeNode => applyMark({
  type: 'indentation',
  attrs
}, maybeNode);