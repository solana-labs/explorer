import {
    Config,
    GroupConfig,
    MangoInstructionLayout,
    PerpMarket,
    PerpMarketConfig,
    PerpMarketLayout,
    SpotMarketConfig,
} from '@blockworks-foundation/mango-client';
import { Market } from '@project-serum/serum';
import { AccountInfo, AccountMeta, Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';

// note: mainnet.1 suffices since its a superset of mainnet.0
const mangoGroups = Config.ids().groups.filter(group => group.name !== 'mainnet.0');

// caching of account info's by public keys
const accountInfoCache: Record<string, Promise<AccountInfo<Buffer> | null>> = {};
function getAccountInfo(clusterUrl: string, publicKey: PublicKey): Promise<AccountInfo<Buffer> | null> {
    if (publicKey.toBase58() in accountInfoCache) {
        return accountInfoCache[publicKey.toBase58()];
    }
    const connection = new Connection(clusterUrl);
    const accountInfoPromise = connection.getAccountInfo(publicKey);
    accountInfoCache[publicKey.toBase58()] = accountInfoPromise;
    return accountInfoPromise;
}

function findGroupConfig(programId: PublicKey): GroupConfig | undefined {
    const filtered = mangoGroups.filter(group => group.mangoProgramId.equals(programId));
    if (filtered.length) {
        return filtered[0];
    }
}

export const isMangoInstruction = (instruction: TransactionInstruction) => {
    return mangoGroups.map(group => group.mangoProgramId.toBase58()).includes(instruction.programId.toBase58());
};

export const parseMangoInstructionTitle = (instruction: TransactionInstruction): string => {
    const decodedInstruction = MangoInstructionLayout.decode(instruction.data, 0);
    return Object.keys(decodedInstruction)[0];
};

export type Deposit = {
    quantity: number;
};

export const decodeDeposit = (ix: TransactionInstruction): Deposit => {
    const decoded = MangoInstructionLayout.decode(ix.data, 0);
    const deposit: Deposit = {
        quantity: decoded.Deposit.quantity.toNumber(),
    };
    return deposit;
};

export type AddToBasket = {
    marketIndex: number;
};

export const decodeAddToBasket = (ix: TransactionInstruction): AddToBasket => {
    const decoded = MangoInstructionLayout.decode(ix.data, 0);
    const addToBasket: AddToBasket = {
        marketIndex: decoded.AddToBasket.marketIndex.toNumber(),
    };
    return addToBasket;
};

export type Withdraw = {
    quantity: number;
    allowBorrow: string;
};

export const decodeWithdraw = (ix: TransactionInstruction): Withdraw => {
    const decoded = MangoInstructionLayout.decode(ix.data, 0);
    const withdraw: Withdraw = {
        allowBorrow: decoded.Withdraw.allowBorrow.toString(),
        quantity: decoded.Withdraw.quantity.toNumber(),
    };
    return withdraw;
};

export type PlaceSpotOrder = {
    side: string;
    limitPrice: number;
    maxBaseQuantity: number;
    maxQuoteQuantity: number;
    selfTradeBehavior: string;
    orderType: string;
    clientId: string;
    limit: string;
};

export const decodePlaceSpotOrder = (ix: TransactionInstruction): PlaceSpotOrder => {
    const decoded = MangoInstructionLayout.decode(ix.data, 0);
    const placeSpotOrder: PlaceSpotOrder = {
        clientId: decoded.PlaceSpotOrder.clientId.toString(),
        limit: decoded.PlaceSpotOrder.limit.toString(),
        limitPrice: decoded.PlaceSpotOrder.limitPrice.toNumber(),
        maxBaseQuantity: decoded.PlaceSpotOrder.maxBaseQuantity.toNumber(),
        maxQuoteQuantity: decoded.PlaceSpotOrder.maxQuoteQuantity.toNumber(),
        orderType: decoded.PlaceSpotOrder.orderType.toString(),
        selfTradeBehavior: decoded.PlaceSpotOrder.selfTradeBehavior,
        side: decoded.PlaceSpotOrder.side.toString(),
    };

    return placeSpotOrder;
};

export type CancelSpotOrder = {
    orderId: string;
    side: string;
};

export const decodeCancelSpotOrder = (ix: TransactionInstruction): CancelSpotOrder => {
    const decoded = MangoInstructionLayout.decode(ix.data, 0);
    const cancelSpotOrder: CancelSpotOrder = {
        orderId: decoded.CancelSpotOrder.orderId.toString(),
        side: decoded.CancelSpotOrder.side.toString(),
    };
    return cancelSpotOrder;
};

export type PlacePerpOrder = {
    price: number;
    quantity: number;
    clientOrderId: string;
    side: string;
    orderType: string;
    reduceOnly: string;
};

export const decodePlacePerpOrder = (ix: TransactionInstruction): PlacePerpOrder => {
    const decoded = MangoInstructionLayout.decode(ix.data, 0);
    const placePerpOrder: PlacePerpOrder = {
        clientOrderId: decoded.PlacePerpOrder.clientOrderId.toString(),
        orderType: decoded.PlacePerpOrder.orderType.toString(),
        price: decoded.PlacePerpOrder.price.toNumber(),
        quantity: decoded.PlacePerpOrder.quantity.toNumber(),
        reduceOnly: decoded.PlacePerpOrder.reduceOnly.toString(),
        side: decoded.PlacePerpOrder.side.toString(),
    };

    return placePerpOrder;
};

export type PlacePerpOrder2 = {
    price: number;
    maxBaseQuantity: number;
    clientOrderId: string;
    side: string;
    orderType: string;
    reduceOnly: string;
    expiryTimestamp: number;
};

export const decodePlacePerpOrder2 = (ix: TransactionInstruction): PlacePerpOrder2 => {
    const decoded = MangoInstructionLayout.decode(ix.data, 0);
    const placePerpOrder2: PlacePerpOrder2 = {
        clientOrderId: decoded.PlacePerpOrder2.clientOrderId.toString(),
        expiryTimestamp: decoded.PlacePerpOrder2.expiryTimestamp.toNumber(),
        maxBaseQuantity: decoded.PlacePerpOrder2.maxBaseQuantity.toNumber(),
        orderType: decoded.PlacePerpOrder2.orderType.toString(),
        price: decoded.PlacePerpOrder2.price.toNumber(),
        reduceOnly: decoded.PlacePerpOrder2.reduceOnly.toString(),
        side: decoded.PlacePerpOrder2.side.toString(),
    };

    return placePerpOrder2;
};

export type CancelPerpOrder = {
    orderId: string;
    invalidIdOk: string;
};

export const decodeCancelPerpOrder = (ix: TransactionInstruction): CancelPerpOrder => {
    const decoded = MangoInstructionLayout.decode(ix.data, 0);
    const cancelPerpOrder: CancelPerpOrder = {
        invalidIdOk: decoded.CancelPerpOrder.invalidIdOk.toString(),
        orderId: decoded.CancelPerpOrder.orderId.toString(),
    };
    return cancelPerpOrder;
};

export type ChangePerpMarketParams = {
    maintLeverageOption: boolean;
    maintLeverage: number;
    initLeverageOption: boolean;
    initLeverage: number;
    liquidationFeeOption: boolean;
    liquidationFee: number;
    makerFeeOption: boolean;
    makerFee: number;
    takerFeeOption: boolean;
    takerFee: number;
    rateOption: boolean;
    rate: number;
    maxDepthBpsOption: boolean;
    maxDepthBps: number;
    targetPeriodLengthOption: boolean;
    targetPeriodLength: number;
    mngoPerPeriodOption: boolean;
    mngoPerPeriod: number;
};

export const decodeChangePerpMarketParams = (ix: TransactionInstruction): ChangePerpMarketParams => {
    const decoded = MangoInstructionLayout.decode(ix.data, 0);
    const changePerpMarketParams: ChangePerpMarketParams = {
        initLeverage: decoded.ChangePerpMarketParams.initLeverage.toString(),
        initLeverageOption: decoded.ChangePerpMarketParams.initLeverageOption,
        liquidationFee: decoded.ChangePerpMarketParams.liquidationFee.toString(),
        liquidationFeeOption: decoded.ChangePerpMarketParams.liquidationFeeOption,
        maintLeverage: decoded.ChangePerpMarketParams.maintLeverage.toString(),
        maintLeverageOption: decoded.ChangePerpMarketParams.maintLeverageOption,
        makerFee: decoded.ChangePerpMarketParams.makerFee.toString(),
        makerFeeOption: decoded.ChangePerpMarketParams.makerFeeOption,
        maxDepthBps: decoded.ChangePerpMarketParams.maxDepthBps.toString(),
        maxDepthBpsOption: decoded.ChangePerpMarketParams.maxDepthBpsOption,
        mngoPerPeriod: decoded.ChangePerpMarketParams.mngoPerPeriod.toString(),
        mngoPerPeriodOption: decoded.ChangePerpMarketParams.mngoPerPeriodOption,
        rate: decoded.ChangePerpMarketParams.rate.toString(),
        rateOption: decoded.ChangePerpMarketParams.rateOption,
        takerFee: decoded.ChangePerpMarketParams.takerFee.toString(),
        takerFeeOption: decoded.ChangePerpMarketParams.takerFeeOption,
        targetPeriodLength: decoded.ChangePerpMarketParams.targetPeriodLength.toString(),
        targetPeriodLengthOption: decoded.ChangePerpMarketParams.targetPeriodLengthOption,
    };
    return changePerpMarketParams;
};

export type AddSpotMarket = {
    marketIndex: number;
    maintLeverage: number;
    initLeverage: number;
    liquidationFee: number;
    optimalUtil: number;
    optimalRate: number;
    maxRate: number;
};

export const decodeAddSpotMarket = (ix: TransactionInstruction): AddSpotMarket => {
    const decoded = MangoInstructionLayout.decode(ix.data, 0);
    const addSpotMarket: AddSpotMarket = {
        initLeverage: decoded.AddSpotMarket.initLeverage.toNumber(),
        liquidationFee: decoded.AddSpotMarket.liquidationFee.toNumber(),
        maintLeverage: decoded.AddSpotMarket.maintLeverage.toNumber(),
        marketIndex: decoded.AddSpotMarket.marketIndex.toNumber(),
        maxRate: decoded.AddSpotMarket.maxRate.toNumber(),
        optimalRate: decoded.AddSpotMarket.optimalRate.toNumber(),
        optimalUtil: decoded.AddSpotMarket.optimalUtil.toNumber(),
    };
    return addSpotMarket;
};

export type AddPerpMarket = {
    marketIndex: number;
    maintLeverage: number;
    initLeverage: number;
    liquidationFee: number;
    makerFee: number;
    takerFee: number;
    baseLotSize: number;
    quoteLotSize: number;
    rate: number;
    maxDepthBps: number;
    targetPeriodLength: number;
    mngoPerPeriod: number;
};

export const decodeAddPerpMarket = (ix: TransactionInstruction): AddPerpMarket => {
    const decoded = MangoInstructionLayout.decode(ix.data, 0);
    const addPerpMarket: AddPerpMarket = {
        baseLotSize: decoded.AddPerpMarket.baseLotSize.toNumber(),
        initLeverage: decoded.AddPerpMarket.initLeverage.toNumber(),
        liquidationFee: decoded.AddPerpMarket.liquidationFee.toNumber(),
        maintLeverage: decoded.AddPerpMarket.maintLeverage.toNumber(),
        makerFee: decoded.AddPerpMarket.makerFee.toNumber(),
        marketIndex: decoded.AddPerpMarket.marketIndex.toNumber(),
        maxDepthBps: decoded.AddPerpMarket.maxDepthBps.toNumber(),
        mngoPerPeriod: decoded.AddPerpMarket.mngoPerPeriod.toNumber(),
        quoteLotSize: decoded.AddPerpMarket.quoteLotSize.toNumber(),
        rate: decoded.AddPerpMarket.rate.toNumber(),
        takerFee: decoded.AddPerpMarket.takerFee.toNumber(),
        targetPeriodLength: decoded.AddPerpMarket.targetPeriodLength.toNumber(),
    };
    return addPerpMarket;
};

export type OrderLotDetails = {
    price: number;
    size: number;
};

////

export function logAllKeys(keys: AccountMeta[]) {
    keys.map(key => console.log(key.pubkey.toBase58()));
}

export function getSpotMarketFromInstruction(
    ix: TransactionInstruction,
    spotMarket: AccountMeta
): SpotMarketConfig | undefined {
    const groupConfig = findGroupConfig(ix.programId);
    if (groupConfig === undefined) {
        return;
    }
    const spotMarketConfigs = groupConfig.spotMarkets.filter(mangoSpotMarket =>
        spotMarket.pubkey.equals(mangoSpotMarket.publicKey)
    );
    if (spotMarketConfigs.length) {
        return spotMarketConfigs[0];
    }
}

export async function getSpotMarketFromSpotMarketConfig(
    programId: PublicKey,
    clusterUrl: string,
    mangoSpotMarketConfig: SpotMarketConfig
): Promise<Market | undefined> {
    const connection = new Connection(clusterUrl);
    const groupConfig = findGroupConfig(programId);
    if (groupConfig === undefined) {
        return;
    }
    return await Market.load(connection, mangoSpotMarketConfig.publicKey, undefined, groupConfig.serumProgramId);
}

export function getPerpMarketFromInstruction(
    ix: TransactionInstruction,
    perpMarket: AccountMeta
): PerpMarketConfig | undefined {
    const groupConfig = findGroupConfig(ix.programId);
    if (groupConfig === undefined) {
        return;
    }
    const perpMarketConfigs = groupConfig.perpMarkets.filter(mangoPerpMarket =>
        perpMarket.pubkey.equals(mangoPerpMarket.publicKey)
    );
    if (perpMarketConfigs.length) {
        return perpMarketConfigs[0];
    }
}

export async function getPerpMarketFromPerpMarketConfig(
    clusterUrl: string,
    mangoPerpMarketConfig: PerpMarketConfig
): Promise<PerpMarket> {
    const acc = await getAccountInfo(clusterUrl, mangoPerpMarketConfig.publicKey);
    const decoded = PerpMarketLayout.decode(acc?.data);

    return new PerpMarket(
        mangoPerpMarketConfig.publicKey,
        mangoPerpMarketConfig.baseDecimals,
        mangoPerpMarketConfig.quoteDecimals,
        decoded
    );
}

export function spotMarketFromIndex(ix: TransactionInstruction, marketIndex: number): string | undefined {
    const groupConfig = findGroupConfig(ix.programId);
    if (groupConfig === undefined) {
        return;
    }
    const spotMarketConfigs = groupConfig.spotMarkets.filter(
        spotMarketConfig => spotMarketConfig.marketIndex === marketIndex
    );
    if (!spotMarketConfigs.length) {
        return 'UNKNOWN';
    }
    return spotMarketConfigs[0].name;
}
