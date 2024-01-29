import { ParsedData, TokenMintExtensionData } from '..';

export default function isT22NFT(parsedData?: ParsedData): parsedData is TokenMintExtensionData {
    return (
        parsedData &&
        parsedData.parsed.info &&
        parsedData.parsed.info.extensions &&
        (parsedData.parsed.info.extensions as Record<string, string>[]).find(ext => ext.extension === 'metadataPointer')
    );
}
