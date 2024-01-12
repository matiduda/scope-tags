import { applyMark } from '../utils/apply-mark';
export const annotation = attrs => maybeNode => applyMark({
  type: 'annotation',
  attrs
}, maybeNode);