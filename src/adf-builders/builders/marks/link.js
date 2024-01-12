import { applyMark } from '../utils/apply-mark';
export const link = attrs => maybeNode => applyMark({
  type: 'link',
  attrs
}, maybeNode);