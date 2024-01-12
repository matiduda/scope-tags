import { applyMark } from '../utils/apply-mark';
export const code = maybeNode => applyMark({
  type: 'code'
}, maybeNode);