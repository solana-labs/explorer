/**
 * This is a port of the anchor command `anchor idl convert` to TypeScript.
 */
import { Idl } from '@coral-xyz/anchor';
import { IdlInstruction, IdlType, IdlMetadata, IdlTypeDef, IdlAccount, IdlEvent, IdlErrorCode, IdlField, IdlConst, IdlInstructionAccountItem, IdlInstructionAccounts, IdlTypeGeneric, IdlTypeDefined, IdlTypeDefTyType } from '@coral-xyz/anchor/dist/cjs/idl';
import { snakeCase } from 'change-case';
import { sha256 } from '@noble/hashes/sha256';

// Legacy types based on the Rust structs
// Should be included in next minor release of anchor
interface LegacyIdl {
    version: string;
    name: string;
    docs?: string[];
    constants: LegacyIdlConst[];
    instructions: LegacyIdlInstruction[];
    accounts: LegacyIdlTypeDefinition[];
    types: LegacyIdlTypeDefinition[];
    events?: LegacyIdlEvent[];
    errors?: LegacyIdlErrorCode[];
    metadata?: any;
}

interface LegacyIdlConst {
    name: string;
    type: LegacyIdlType;
    value: string;
}

interface LegacyIdlInstruction {
    name: string;
    docs?: string[];
    accounts: LegacyIdlAccountItem[];
    args: LegacyIdlField[];
    returns?: LegacyIdlType;
}

interface LegacyIdlTypeDefinition {
    name: string;
    docs?: string[];
    type: LegacyIdlTypeDefinitionTy;
}

type LegacyIdlTypeDefinitionTy =
    | { kind: 'struct'; fields: LegacyIdlField[] }
    | { kind: 'enum'; variants: LegacyIdlEnumVariant[] }
    | { kind: 'alias'; value: LegacyIdlType };

interface LegacyIdlField {
    name: string;
    docs?: string[];
    type: LegacyIdlType;
}

interface LegacyIdlEnumVariant {
    name: string;
    fields?: LegacyEnumFields;
}

type LegacyEnumFields = LegacyIdlField[] | LegacyIdlType[];

interface LegacyIdlEvent {
    name: string;
    fields: LegacyIdlEventField[];
}

interface LegacyIdlEventField {
    name: string;
    type: LegacyIdlType;
    index: boolean;
}

interface LegacyIdlErrorCode {
    code: number;
    name: string;
    msg?: string;
}

type LegacyIdlAccountItem = LegacyIdlAccount | LegacyIdlAccounts;

interface LegacyIdlAccount {
    name: string;
    isMut: boolean;
    isSigner: boolean;
    isOptional?: boolean;
    docs?: string[];
    pda?: LegacyIdlPda;
    relations: string[];
}

interface LegacyIdlAccounts {
    name: string;
    accounts: LegacyIdlAccountItem[];
}

interface LegacyIdlPda {
    seeds: LegacyIdlSeed[];
    programId?: LegacyIdlSeed;
}

type LegacyIdlSeed =
    | { kind: 'const'; type: LegacyIdlType; value: any }
    | { kind: 'arg'; type: LegacyIdlType; path: string }
    | { kind: 'account'; type: LegacyIdlType; account?: string; path: string };

type LegacyIdlType =
    | 'bool'
    | 'u8' | 'i8' | 'u16' | 'i16' | 'u32' | 'i32' | 'u64' | 'i64' | 'u128' | 'i128'
    | 'f32' | 'f64'
    | 'bytes' | 'string' | 'publicKey'
    | { vec: LegacyIdlType }
    | { option: LegacyIdlType }
    | { defined: string }
    | { array: [LegacyIdlType, number] }
    | { generic: string }
    | { definedWithTypeArgs: { name: string; args: LegacyIdlDefinedTypeArg[] } };

type LegacyIdlDefinedTypeArg =
    | { generic: string }
    | { value: string }
    | { type: LegacyIdlType };

function convertLegacyIdl(legacyIdl: LegacyIdl, programAddress?: string): Idl {
    const address: string | undefined = programAddress ?? legacyIdl.metadata?.address;
    if (!address) {
        throw new Error("Program id missing in `idl.metadata.address` field");
    }
    return {
        address: address,
        instructions: legacyIdl.instructions.map(convertInstruction),
        accounts: (legacyIdl.accounts || []).map(convertAccount),
        types: [
            ...(legacyIdl.types || []).map(convertTypeDef),
            ...(legacyIdl.accounts || []).map(convertTypeDef),
            ...(legacyIdl.events || []).map(convertEventToTypeDef),
        ],
        events: legacyIdl.events?.map(convertEvent) || [],
        errors: legacyIdl.errors?.map(convertErrorCode) || [],
        constants: (legacyIdl.constants || []).map(convertConst),
        metadata: {
            version: legacyIdl.version,
            name: legacyIdl.name,
        } as IdlMetadata,
    };
}

function getDisc(prefix: string, name: string): number[] {
    const hash = sha256(`${prefix}:${name}`);
    return Array.from(hash.slice(0, 8));
}

function convertInstruction(instruction: LegacyIdlInstruction): IdlInstruction {
    const name = snakeCase(instruction.name);
    return {
        name,
        accounts: instruction.accounts.map(convertInstructionAccount),
        args: instruction.args.map(convertField),
        discriminator: getDisc('global', name),
        returns: instruction.returns ? convertType(instruction.returns) : undefined,
    };
}

function convertAccount(account: LegacyIdlTypeDefinition): IdlAccount {
    return {
        name: account.name,
        discriminator: getDisc('account', account.name),
    };
}

function convertTypeDef(typeDef: LegacyIdlTypeDefinition): IdlTypeDef {
    return {
        name: typeDef.name,
        type: convertTypeDefTy(typeDef.type),
    };
}

function convertTypeDefTy(type: LegacyIdlTypeDefinitionTy): IdlTypeDef['type'] {
    switch (type.kind) {
        case 'struct':
            return {
                kind: 'struct',
                fields: type.fields.map(convertField),
            };
        case 'enum':
            return {
                kind: 'enum',
                variants: type.variants.map(convertEnumVariant),
            };
        case 'alias':
            return {
                kind: 'type',
                alias: convertType(type.value),
            };
    }
}

function convertField(field: LegacyIdlField): IdlField {
    return {
        name: snakeCase(field.name),
        type: convertType(field.type),
    };
}

function convertEnumVariant(variant: LegacyIdlEnumVariant): { name: string; fields?: IdlField[] } {
    return {
        name: variant.name,
        fields: variant.fields ? convertEnumFields(variant.fields) : undefined,
    };
}

function convertEnumFields(fields: LegacyEnumFields): IdlField[] {
    if (Array.isArray(fields) && fields.length > 0 && typeof fields[0] === 'object' && 'type' in fields[0]) {
        return (fields as LegacyIdlField[]).map(convertField);
    } else {
        return (fields as LegacyIdlType[]).map(type => ({ name: '', type: convertType(type) }));
    }
}

function convertEvent(event: LegacyIdlEvent): IdlEvent {
    return {
        name: event.name,
        discriminator: getDisc('event', event.name),
    };
}

function convertErrorCode(error: LegacyIdlErrorCode): IdlErrorCode {
    return {
        code: error.code,
        name: error.name,
        msg: error.msg,
    };
}

function convertConst(constant: LegacyIdlConst): IdlConst {
    return {
        name: constant.name,
        type: convertType(constant.type),
        value: constant.value,
    };
}

function convertInstructionAccount(account: LegacyIdlAccountItem): IdlInstructionAccountItem {
    if ('accounts' in account) {
        return convertInstructionAccounts(account);
    } else {
        return {
            name: snakeCase(account.name),
            docs: account.docs || [],
            writable: account.isMut || false,
            signer: account.isSigner || false,
            optional: account.isOptional || false,
            pda: account.pda ? convertPda(account.pda) : undefined,
            relations: account.relations || [],
        };
    }
}

function convertInstructionAccounts(accounts: LegacyIdlAccounts): IdlInstructionAccounts {
    return {
        name: snakeCase(accounts.name),
        accounts: accounts.accounts.map(convertInstructionAccount),
    };
}

function convertPda(pda: LegacyIdlPda): { seeds: any[]; programId?: any } {
    return {
        seeds: pda.seeds.map(convertSeed),
        programId: pda.programId ? convertSeed(pda.programId) : undefined,
    };
}

function convertSeed(seed: LegacyIdlSeed): any {
    switch (seed.kind) {
        case 'const':
            return { kind: 'const', type: convertType(seed.type), value: seed.value };
        case 'arg':
            return { kind: 'arg', type: convertType(seed.type), path: seed.path };
        case 'account':
            return {
                kind: 'account',
                type: convertType(seed.type),
                account: seed.account,
                path: seed.path,
            };
    }
}

function convertEventToTypeDef(event: LegacyIdlEvent): IdlTypeDef {
    return {
        name: event.name,
        type: {
            kind: 'struct',
            fields: event.fields.map(field => ({
                name: snakeCase(field.name),
                type: convertType(field.type),
            })),
        },
    };
}

function convertType(type: LegacyIdlType): IdlType {
    if (typeof type === 'string') {
        return type === 'publicKey' ? 'pubkey' : type;
    } else if ('vec' in type) {
        return { vec: convertType(type.vec) };
    } else if ('option' in type) {
        return { option: convertType(type.option) };
    } else if ('defined' in type) {
        return { defined: { name: type.defined, generics: [] } } as IdlTypeDefined;
    } else if ('array' in type) {
        return { array: [convertType(type.array[0]), type.array[1]] };
    } else if ('generic' in type) {
        return type;
    } else if ('definedWithTypeArgs' in type) {
        return {
            defined: { name: type.definedWithTypeArgs.name, generics: type.definedWithTypeArgs.args.map(convertDefinedTypeArg) },
        } as IdlTypeDefined;
    }
    throw new Error(`Unsupported type: ${JSON.stringify(type)}`);
}

function convertDefinedTypeArg(arg: LegacyIdlDefinedTypeArg): any {
    if ('generic' in arg) {
        return { generic: arg.generic };
    } else if ('value' in arg) {
        return { value: arg.value };
    } else if ('type' in arg) {
        return { type: convertType(arg.type) };
    }
    throw new Error(`Unsupported defined type arg: ${JSON.stringify(arg)}`);
}

export function formatIdl(idl: any, programAddress?: string): Idl {
    const spec = idl.metadata?.spec;

    if (spec) {
        switch (spec) {
            case '0.1.0':
                return idl as Idl;
            default:
                throw new Error(`IDL spec not supported: ${spec}`);
        }
    } else {
        return convertLegacyIdl(idl as LegacyIdl, programAddress);
    }
}