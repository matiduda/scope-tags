import { applyMark } from '../utils/apply-mark';
export const strike = maybeNode => applyMark({
  type: 'strike'
}, maybeNode);