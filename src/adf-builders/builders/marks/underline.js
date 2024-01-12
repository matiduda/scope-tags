import { applyMark } from '../utils/apply-mark';
export const underline = maybeNode => applyMark({
  type: 'underline'
}, maybeNode);