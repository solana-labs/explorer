import { cn } from '@components/shared/utils';

// Shared header chrome for the inspector's card tables (Signatures, Address Table Lookups): drop the dark
// background band so the header blends into the card, and use a subtle white/10 bottom rule instead of the
// default #282d2b separator (the first body row's top border is removed so the header owns the single
// dividing line). Pairs with DENSE_ROW_PADDING on the same table.
export const CARD_TABLE_HEADER = cn(
    '[&_thead_th]:!bg-transparent',
    '[&_thead_th]:!border-b [&_thead_th]:!border-solid [&_thead_th]:!border-white/10',
    '[&_thead_th]:!text-xs',
    '[&_tbody_tr:first-child_td]:!border-t-0',
);

// Card chrome gated to lg+. On mobile each row renders as its own card, so the section wrapper must NOT
// add a card surface there (otherwise per-row cards sit inside a second card). At lg+ the rows form a
// grid table, so the dashkit card surface frames it. Used by the Account List and Address Lookups.
export const LG_ONLY_CARD = cn(
    'lg:rounded-lg lg:border lg:border-solid lg:border-dk-card-outline-dark',
    'lg:bg-dk-gray-800-dark lg:shadow-dk-card',
);
