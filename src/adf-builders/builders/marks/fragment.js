import { applyMark } from '../utils/apply-mark';
export const fragment = attrs => maybeNode => {
  return applyMark({
    type: 'fragment',
    attrs
  }, maybeNode);
};