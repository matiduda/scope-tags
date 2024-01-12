import { applyMark } from '../utils/apply-mark';
export const strong = maybeNode => applyMark({
  type: 'strong'
}, maybeNode);