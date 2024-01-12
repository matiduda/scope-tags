import { applyMark } from '../utils/apply-mark';
export const em = maybeNode => {
  return applyMark({
    type: 'em'
  }, maybeNode);
};