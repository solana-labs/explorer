import { LAMPORTS_PER_SOL, lamportsToSol } from '@utils/index';

describe('lamportsToSol', () => {
    it('0 lamports', () => {
        expect(lamportsToSol(0)).toBe(0.0);
        expect(lamportsToSol(BigInt(0))).toBe(0.0);
    });

    it('1 lamport', () => {
        expect(lamportsToSol(1)).toBe(0.000000001);
        expect(lamportsToSol(BigInt(1))).toBe(0.000000001);
        expect(lamportsToSol(-1)).toBe(-0.000000001);
        expect(lamportsToSol(BigInt(-1))).toBe(-0.000000001);
    });

    it('1 SOL', () => {
        expect(lamportsToSol(LAMPORTS_PER_SOL)).toBe(1.0);
        expect(lamportsToSol(BigInt(LAMPORTS_PER_SOL))).toBe(1.0);
        expect(lamportsToSol(-LAMPORTS_PER_SOL)).toBe(-1.0);
        expect(lamportsToSol(BigInt(-LAMPORTS_PER_SOL))).toBe(-1.0);
    });

    it('u64::MAX lamports', () => {
        expect(lamportsToSol(2n ** 64n)).toBe(18446744073.709553);
        expect(lamportsToSol(-(2n ** 64n))).toBe(-18446744073.709553);
    });
});
