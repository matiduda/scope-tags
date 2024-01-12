import { applyMark } from '../utils/apply-mark';
export const dataConsumer = attrs => maybeNode => {
  return applyMark({
    type: 'dataConsumer',
    attrs
  }, maybeNode);
};