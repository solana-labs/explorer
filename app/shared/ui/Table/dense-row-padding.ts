// Dense row spacing for card tables: 12px horizontal / 10px vertical padding on every cell, with
// content top-aligned. `!` beats BaseTable's default `p-4`, its edge `pl-6`/`pr-6`, and `align-middle`
// — cn keeps all classes, so important wins regardless of stylesheet order. Pass through the table's
// `className` (e.g. `ProgramLogsCardBody`'s `className` in the inspector simulation panel).
export const DENSE_ROW_PADDING =
    '[&_th]:!px-3 [&_th]:!py-2.5 [&_th]:!align-top [&_td]:!px-3 [&_td]:!py-2.5 [&_td]:!align-top';
