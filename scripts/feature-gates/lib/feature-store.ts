import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { create } from 'superstruct';

import {
    type FeatureGate,
    type FeatureGateDraft,
    FeatureGatesArraySchema,
} from '../../../app/entities/feature-gate/lib/feature-gates-schema';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, '..', '..', '..');
export const FEATURE_GATES_PATH = join(REPO_ROOT, 'app/entities/feature-gate/feature-gates.json');

export function readFeatureGates(): FeatureGate[] {
    if (!existsSync(FEATURE_GATES_PATH)) return [];
    const raw = JSON.parse(readFileSync(FEATURE_GATES_PATH, 'utf8'));
    return create(raw, FeatureGatesArraySchema);
}

export function writeFeatureGates(features: FeatureGateDraft[]): void {
    // `create` validates each draft's plain-string `key` as a base58 address and
    // returns rows with `key` branded to kit's `Address` — the write boundary
    // where producer drafts become the validated on-disk/read shape.
    const validated = create(features, FeatureGatesArraySchema);
    writeFileSync(FEATURE_GATES_PATH, `${escapeNonAscii(JSON.stringify(validated, undefined, 2))}\n`);
}

// Match Python json.dumps default (ensure_ascii=True): emit \uXXXX for every
// non-ASCII codepoint so the on-disk file stays pure ASCII regardless of writer.
// JS strings are UTF-16, so astral codepoints already surface as surrogate
// pairs; emitting each half as \uXXXX matches Python's output byte-for-byte.
export function escapeNonAscii(json: string): string {
    let out = '';
    for (let i = 0; i < json.length; i += 1) {
        const code = json.charCodeAt(i);
        out += code < 0x80 ? json[i] : `\\u${code.toString(16).padStart(4, '0')}`;
    }
    return out;
}
