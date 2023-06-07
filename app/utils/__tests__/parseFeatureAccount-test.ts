import { PublicKey } from '@solana/web3.js';
import { FEATURE_PROGRAM_ID, parseFeatureAccount } from '@utils/parseFeatureAccount';

describe('parseFeatureAccount', () => {
    it('parses an activated feature', () => {
        const buffer = new Uint8Array([0x01, 0x80, 0xc2, 0x2b, 0x0a, 0x00, 0x00, 0x00, 0x00]);
        const feature = parseFeatureAccount({
            data: { raw: buffer as Buffer },
            executable: false,
            lamports: 1,
            owner: new PublicKey(FEATURE_PROGRAM_ID),
            pubkey: new PublicKey('7txXZZD6Um59YoLMF7XUNimbMjsqsWhc7g2EniiTrmp1'),
            space: buffer.length,
        });
        expect(feature?.activatedAt).toBe(170640000);
    });
    it('parses a feature that is scheduled for activation', () => {
        const buffer = new Uint8Array([0x00]);
        const feature = parseFeatureAccount({
            data: { raw: buffer as Buffer },
            executable: false,
            lamports: 1,
            owner: new PublicKey(FEATURE_PROGRAM_ID),
            pubkey: new PublicKey('7txXZZD6Um59YoLMF7XUNimbMjsqsWhc7g2EniiTrmp1'),
            space: buffer.length,
        });
        expect(feature?.activatedAt).toBeNull();
    });
});
