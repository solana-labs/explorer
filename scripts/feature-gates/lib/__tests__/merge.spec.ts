import type { FeatureGateDraft } from '../../../../app/entities/feature-gate/lib/feature-gates-schema';
import { appendNewFeatures, hasDescription, resolveEpoch } from '../merge';
import type { FeatureProbeResult } from '../rpc';

// The merge pipeline logs CLI progress via console.log; silence it under test.
beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
});

// The merge pipeline operates on drafts (plain-string `key`), so these fixtures
// use sentinel keys like 'A'/'KEY' to exercise dedup/append logic — base58
// validation happens later, at the `create()` write boundary.
function feature(overrides: Partial<FeatureGateDraft> = {}): FeatureGateDraft {
    return {
        comms_required: null,
        description: '',
        devnet_activation_epoch: null,
        key: 'KEY',
        mainnet_activation_epoch: null,
        min_agave_versions: [],
        min_fd_versions: [],
        min_jito_versions: [],
        owners: [],
        planned_testnet_order: null,
        simd_link: [],
        simds: [],
        testnet_activation_epoch: null,
        title: '',
        ...overrides,
    };
}

const activated = (epoch: number): FeatureProbeResult => ({ epoch, kind: 'activated' });
const unreachable: FeatureProbeResult = { kind: 'unreachable' };
const missing: FeatureProbeResult = { kind: 'missing' };
const unactivated: FeatureProbeResult = { kind: 'unactivated' };

describe('resolveEpoch', () => {
    it('should trust a freshly-derived epoch in both modes', () => {
        expect(resolveEpoch(activated(800), null, 'default')).toBe(800);
        expect(resolveEpoch(activated(800), 700, 'refresh-activated')).toBe(800);
    });

    it('should preserve the backup value on an unreachable RPC regardless of mode', () => {
        expect(resolveEpoch(unreachable, 700, 'default')).toBe(700);
        expect(resolveEpoch(unreachable, 700, 'refresh-activated')).toBe(700);
        expect(resolveEpoch(unreachable, null, 'refresh-activated')).toBeNull();
    });

    it('should preserve the backup value for missing/unactivated accounts in default mode', () => {
        expect(resolveEpoch(missing, 700, 'default')).toBe(700);
        expect(resolveEpoch(unactivated, 700, 'default')).toBe(700);
    });

    it('should clear the field for missing/unactivated accounts in refresh-activated mode', () => {
        expect(resolveEpoch(missing, 700, 'refresh-activated')).toBeNull();
        expect(resolveEpoch(unactivated, 700, 'refresh-activated')).toBeNull();
    });
});

describe('appendNewFeatures', () => {
    it('should append only scraped features whose key is not already known', () => {
        const existing = [feature({ key: 'A', title: 'kept' })];
        const scraped = [feature({ key: 'A', title: 'schedule-A' }), feature({ key: 'B', title: 'schedule-B' })];
        const result = appendNewFeatures(existing, scraped);
        expect(result.map(f => f.key)).toEqual(['A', 'B']);
    });

    it('should leave existing rows untouched (no schedule metadata merge-back)', () => {
        const existing = [feature({ key: 'A', title: 'kept' })];
        const scraped = [feature({ key: 'A', title: 'schedule-overwrite' })];
        const result = appendNewFeatures(existing, scraped);
        expect(result).toHaveLength(1);
        expect(result[0]).toBe(existing[0]);
    });

    it('should drop scraped features with an empty key', () => {
        const result = appendNewFeatures([], [feature({ key: '', title: 'no key' }), feature({ key: 'B' })]);
        expect(result.map(f => f.key)).toEqual(['B']);
    });

    it('should return the existing list unchanged when nothing new is scraped', () => {
        const existing = [feature({ key: 'A' })];
        expect(appendNewFeatures(existing, [])).toEqual(existing);
    });
});

describe('hasDescription', () => {
    it('should treat empty and whitespace-only descriptions as missing', () => {
        expect(hasDescription(feature({ description: '' }))).toBe(false);
        expect(hasDescription(feature({ description: '   ' }))).toBe(false);
    });

    it('should treat a non-empty description as present', () => {
        expect(hasDescription(feature({ description: 'A real summary.' }))).toBe(true);
    });
});
