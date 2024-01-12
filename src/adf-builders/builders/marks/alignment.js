import { applyMark } from '../utils/apply-mark';
export const alignment = attrs => maybeNode => applyMark({
  type: 'alignment',
  attrs
}, maybeNode);