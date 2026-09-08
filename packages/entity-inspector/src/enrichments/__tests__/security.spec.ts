import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { gen } from '../../__tests__/gen.js';
import type { InspectorLogger } from '../../logger.js';
import { createSecurityMetadataResolver, type ResolveSecurityMetadata } from '../security.js';

const { fetchPmpSecurityMetadataMock } = vi.hoisted(() => ({
    fetchPmpSecurityMetadataMock: vi.fn(),
}));

vi.mock('../pmp-security.js', () => ({
    fetchPmpSecurityMetadata: fetchPmpSecurityMetadataMock,
}));

const PROGRAM_ADDRESS = gen.tokenProgram;

const RPC_ENDPOINTS = {
    devnet: 'https://devnet.rpc.address',
    'mainnet-beta': 'https://mainnet-beta.rpc.address',
    testnet: 'https://testnet.rpc.address',
};

function encodeSecurityTxt(data: Record<string, string>): string {
    const HEADER = '=======BEGIN SECURITY.TXT V1=======\0';
    const FOOTER = '=======END SECURITY.TXT V1=======\0';
    const parts: string[] = [];
    for (const [k, v] of Object.entries(data)) {
        parts.push(k, v);
    }
    const content = parts.join('\0') + '\0';
    return Buffer.from(HEADER + content + FOOTER, 'utf8').toString('base64');
}

const EMBEDDED_FIELDS = {
    contacts: 'email:security@example.com',
    name: 'Test Program',
    policy: 'https://example.com/policy',
    project_url: 'https://example.com',
};

const EMBEDDED_BASE64 = encodeSecurityTxt(EMBEDDED_FIELDS);
const NO_MARKERS_BASE64 = Buffer.from('no markers here').toString('base64');
const INVALID_EMBEDDED_BASE64 = encodeSecurityTxt({ name: 'Incomplete Embedded' });

const PMP_REQUIRED = {
    contacts: ['email:pmp@example.com', 'discord:prog#1234'],
    name: 'PMP Program',
    policy: 'https://pmp.example.com/policy',
    project_url: 'https://pmp.example.com',
};

function makePmpJson(overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
        ...PMP_REQUIRED,
        acknowledgements: 'https://pmp.example.com/thanks',
        auditors: ['Audit Firm A', 'Audit Firm B'],
        description: 'A PMP program',
        encryption: 'https://pmp.example.com/pgp-key',
        logo: 'https://pmp.example.com/logo.png',
        notification: 'Update your SDK!',
        preferred_languages: ['en', 'de'],
        sdk: 'https://github.com/example/sdk',
        source_code: 'https://github.com/example/program',
        source_release: 'v1.0.0',
        source_revision: 'abc123',
        version: '1.0.0',
        ...overrides,
    });
}

function createLoggerMock(): InspectorLogger {
    return { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() };
}

describe('createSecurityMetadataResolver', () => {
    let logger: InspectorLogger;
    let resolve: ResolveSecurityMetadata;

    beforeEach(() => {
        vi.clearAllMocks();
        fetchPmpSecurityMetadataMock.mockResolvedValue(null);
        logger = createLoggerMock();
        resolve = createSecurityMetadataResolver(RPC_ENDPOINTS, logger);
    });

    it('should pass the factory rpc endpoints through to the PMP fetch', async () => {
        await resolve(PROGRAM_ADDRESS, null, 'devnet');

        expect(fetchPmpSecurityMetadataMock).toHaveBeenCalledWith(PROGRAM_ADDRESS, 'devnet', RPC_ENDPOINTS);
    });

    it('should return present from PMP with normalized fields', async () => {
        fetchPmpSecurityMetadataMock.mockResolvedValue(makePmpJson());

        const result = await resolve(PROGRAM_ADDRESS, EMBEDDED_BASE64, 'mainnet-beta');

        expect(result).toMatchObject({ source_type: 'pmp_canonical', status: 'present' });
        if (result.status === 'present') {
            expect(result.data.contacts).toBe('email:pmp@example.com,discord:prog#1234');
            expect(result.data.preferred_languages).toBe('en,de');
            expect(result.data.auditors).toBe('Audit Firm A,Audit Firm B');
            expect(result.data.acknowledgements).toBe('https://pmp.example.com/thanks');
            expect(result.data.encryption).toBe('https://pmp.example.com/pgp-key');
            expect(result.data.source_code).toBe('https://github.com/example/program');
            expect(result.data.source_release).toBe('v1.0.0');
            expect(result.data.source_revision).toBe('abc123');
            expect(result.data.logo).toBe('https://pmp.example.com/logo.png');
            expect(result.data.description).toBe('A PMP program');
            expect(result.data.notification).toBe('Update your SDK!');
            expect(result.data.sdk).toBe('https://github.com/example/sdk');
            expect(result.data.version).toBe('1.0.0');
        }
    });

    it('should prefer PMP over embedded when both are present', async () => {
        fetchPmpSecurityMetadataMock.mockResolvedValue(makePmpJson());

        const result = await resolve(PROGRAM_ADDRESS, EMBEDDED_BASE64, 'mainnet-beta');

        expect(result).toMatchObject({ source_type: 'pmp_canonical', status: 'present' });
        if (result.status === 'present') {
            expect(result.data.name).toBe('PMP Program');
        }
    });

    it('should accept string contacts as-is in PMP content', async () => {
        fetchPmpSecurityMetadataMock.mockResolvedValue(makePmpJson({ contacts: 'email:solo@example.com' }));

        const result = await resolve(PROGRAM_ADDRESS, null, 'mainnet-beta');

        expect(result.status).toBe('present');
        if (result.status === 'present') {
            expect(result.data.contacts).toBe('email:solo@example.com');
        }
    });

    it('should default omitted PMP optional fields to null', async () => {
        fetchPmpSecurityMetadataMock.mockResolvedValue(JSON.stringify(PMP_REQUIRED));

        const result = await resolve(PROGRAM_ADDRESS, null, 'mainnet-beta');

        expect(result.status).toBe('present');
        if (result.status === 'present') {
            expect(result.data.acknowledgements).toBeNull();
            expect(result.data.auditors).toBeNull();
            expect(result.data.description).toBeNull();
            expect(result.data.encryption).toBeNull();
            expect(result.data.expiry).toBeNull();
            expect(result.data.logo).toBeNull();
            expect(result.data.notification).toBeNull();
            expect(result.data.preferred_languages).toBeNull();
            expect(result.data.sdk).toBeNull();
            expect(result.data.source_code).toBeNull();
            expect(result.data.source_release).toBeNull();
            expect(result.data.source_revision).toBeNull();
            expect(result.data.version).toBeNull();
        }
    });

    it('should normalize PMP fields with non-string optional values to null', async () => {
        fetchPmpSecurityMetadataMock.mockResolvedValue(
            makePmpJson({
                auditors: 'Single Auditor',
                description: undefined,
                encryption: 42,
                logo: 123,
                notification: false,
                sdk: [],
                source_code: null,
                version: {},
            }),
        );

        const result = await resolve(PROGRAM_ADDRESS, null, 'mainnet-beta');

        expect(result.status).toBe('present');
        if (result.status === 'present') {
            expect(result.data.encryption).toBeNull();
            expect(result.data.source_code).toBeNull();
            expect(result.data.logo).toBeNull();
            expect(result.data.description).toBeNull();
            expect(result.data.notification).toBeNull();
            expect(result.data.sdk).toBeNull();
            expect(result.data.version).toBeNull();
            expect(result.data.auditors).toBe('Single Auditor');
        }
    });

    it('should fall back to embedded when PMP misses', async () => {
        const result = await resolve(PROGRAM_ADDRESS, EMBEDDED_BASE64, 'mainnet-beta');

        expect(result).toMatchObject({ source_type: 'embedded_security_txt', status: 'present' });
        if (result.status === 'present') {
            expect(result.data.name).toBe('Test Program');
        }
    });

    it('should return missing when PMP misses and embedded has no markers', async () => {
        const result = await resolve(PROGRAM_ADDRESS, NO_MARKERS_BASE64, 'mainnet-beta');

        expect(result).toEqual({ status: 'missing' });
    });

    it('should return missing when PMP misses and program data is null', async () => {
        const result = await resolve(PROGRAM_ADDRESS, null, 'mainnet-beta');

        expect(result).toEqual({ status: 'missing' });
    });

    it('should fall back to embedded and warn when the PMP fetch throws', async () => {
        const error = new Error('network error');
        fetchPmpSecurityMetadataMock.mockRejectedValue(error);

        const result = await resolve(PROGRAM_ADDRESS, EMBEDDED_BASE64, 'mainnet-beta');

        expect(result).toMatchObject({ source_type: 'embedded_security_txt', status: 'present' });
        expect(logger.warn).toHaveBeenCalledWith('[entity-inspector] security pmp fetch failed', {
            error: { message: 'network error', name: 'Error' },
            programAddress: PROGRAM_ADDRESS,
        });
    });

    it('should return unknown with source_unavailable when the PMP fetch throws and embedded misses', async () => {
        fetchPmpSecurityMetadataMock.mockRejectedValue(new Error('network error'));

        const result = await resolve(PROGRAM_ADDRESS, NO_MARKERS_BASE64, 'mainnet-beta');

        expect(result).toEqual({ reason: 'source_unavailable', status: 'unknown' });
    });

    it('should fall back to embedded and log when PMP returns invalid JSON', async () => {
        fetchPmpSecurityMetadataMock.mockResolvedValue('not valid json {{');

        const result = await resolve(PROGRAM_ADDRESS, EMBEDDED_BASE64, 'mainnet-beta');

        expect(result).toMatchObject({ source_type: 'embedded_security_txt', status: 'present' });
        expect(logger.error).toHaveBeenCalledWith('[entity-inspector] security pmp parse failed', {
            error: expect.objectContaining({ name: 'SyntaxError' }),
            programAddress: PROGRAM_ADDRESS,
        });
    });

    it('should return unknown with security_invalid when PMP JSON is invalid and embedded misses', async () => {
        fetchPmpSecurityMetadataMock.mockResolvedValue('not valid json {{');

        const result = await resolve(PROGRAM_ADDRESS, NO_MARKERS_BASE64, 'mainnet-beta');

        expect(result).toEqual({ reason: 'security_invalid', status: 'unknown' });
    });

    it('should return unknown with security_invalid when PMP JSON is not a record', async () => {
        fetchPmpSecurityMetadataMock.mockResolvedValue('["not","a","record"]');

        const result = await resolve(PROGRAM_ADDRESS, null, 'mainnet-beta');

        expect(result).toEqual({ reason: 'security_invalid', status: 'unknown' });
    });

    it('should return unknown with security_invalid when a required PMP field is missing', async () => {
        const invalidPayloads = [
            { ...PMP_REQUIRED, name: 42 },
            { ...PMP_REQUIRED, project_url: undefined },
            { ...PMP_REQUIRED, contacts: 42 },
            { ...PMP_REQUIRED, policy: null },
        ];

        for (const payload of invalidPayloads) {
            fetchPmpSecurityMetadataMock.mockResolvedValue(JSON.stringify(payload));

            const result = await resolve(PROGRAM_ADDRESS, null, 'mainnet-beta');

            expect(result).toEqual({ reason: 'security_invalid', status: 'unknown' });
        }
    });

    it('should continue to embedded when PMP JSON misses required fields', async () => {
        fetchPmpSecurityMetadataMock.mockResolvedValue(JSON.stringify({ name: 'Incomplete' }));

        const result = await resolve(PROGRAM_ADDRESS, EMBEDDED_BASE64, 'mainnet-beta');

        expect(result).toMatchObject({ source_type: 'embedded_security_txt', status: 'present' });
    });

    it('should return unknown with security_invalid when PMP misses and embedded content is invalid', async () => {
        const result = await resolve(PROGRAM_ADDRESS, INVALID_EMBEDDED_BASE64, 'mainnet-beta');

        expect(result).toEqual({ reason: 'security_invalid', status: 'unknown' });
    });

    it('should prefer the PMP unknown over the embedded unknown', async () => {
        fetchPmpSecurityMetadataMock.mockRejectedValue(new Error('network error'));

        const result = await resolve(PROGRAM_ADDRESS, INVALID_EMBEDDED_BASE64, 'mainnet-beta');

        expect(result).toEqual({ reason: 'source_unavailable', status: 'unknown' });
    });

    describe('expiry handling', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-06-01T00:00:00Z'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should set security_expired on the PMP result when expiry is past', async () => {
            fetchPmpSecurityMetadataMock.mockResolvedValue(makePmpJson({ expiry: '2020-01-01' }));

            const result = await resolve(PROGRAM_ADDRESS, null, 'mainnet-beta');

            expect(result).toMatchObject({
                security_expired: true,
                source_type: 'pmp_canonical',
                status: 'present',
            });
        });

        it('should not set security_expired on the PMP result when expiry is in the future', async () => {
            fetchPmpSecurityMetadataMock.mockResolvedValue(makePmpJson({ expiry: '2099-12-31' }));

            const result = await resolve(PROGRAM_ADDRESS, null, 'mainnet-beta');

            expect(result.status).toBe('present');
            if (result.status === 'present') {
                expect(result.security_expired).toBeUndefined();
            }
        });

        it('should set security_expired on the embedded result when expiry is past', async () => {
            const base64 = encodeSecurityTxt({ ...EMBEDDED_FIELDS, expiry: '2020-01-01' });

            const result = await resolve(PROGRAM_ADDRESS, base64, 'mainnet-beta');

            expect(result).toMatchObject({
                security_expired: true,
                source_type: 'embedded_security_txt',
                status: 'present',
            });
        });

        it('should not set security_expired on the embedded result when expiry is in the future', async () => {
            const base64 = encodeSecurityTxt({ ...EMBEDDED_FIELDS, expiry: '2099-12-31' });

            const result = await resolve(PROGRAM_ADDRESS, base64, 'mainnet-beta');

            expect(result.status).toBe('present');
            if (result.status === 'present') {
                expect(result.security_expired).toBeUndefined();
            }
        });

        it('should not set security_expired when there is no expiry field', async () => {
            const result = await resolve(PROGRAM_ADDRESS, EMBEDDED_BASE64, 'mainnet-beta');

            expect(result.status).toBe('present');
            if (result.status === 'present') {
                expect(result.security_expired).toBeUndefined();
            }
        });

        it('should not set security_expired when expiry is unparseable', async () => {
            const base64 = encodeSecurityTxt({ ...EMBEDDED_FIELDS, expiry: 'not-a-date' });

            const result = await resolve(PROGRAM_ADDRESS, base64, 'mainnet-beta');

            expect(result.status).toBe('present');
            if (result.status === 'present') {
                expect(result.security_expired).toBeUndefined();
            }
        });
    });
});
