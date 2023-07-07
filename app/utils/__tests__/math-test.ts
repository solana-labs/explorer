import { percentage } from '@utils/math';

describe('percentage', () => {
  it('returns a number with the right decimals', () => {
    expect(percentage(BigInt(1), BigInt(3), 0)).toEqual(33)
    expect(percentage(BigInt(1), BigInt(3), 1)).toEqual(33.3)
    expect(percentage(BigInt(1), BigInt(3), 2)).toEqual(33.33)
  });
});
