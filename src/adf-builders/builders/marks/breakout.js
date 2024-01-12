import { applyMark } from '../utils/apply-mark';
export const breakout = attrs => maybeNode => {
  return applyMark({
    type: 'breakout',
    attrs
  }, maybeNode);
};