export type NavigationTab<P extends string = string> = {
    path: P;
    title: string;
    /**
     * When true the tab renders dimmed and non-interactive (no link, no scroll handler). Used to gate
     * tabs whose target section does not exist yet — e.g. the simulation-derived Logs / CU profiling
     * sections before a simulation has run. Pair with `disabledHint` on `BaseNavigationTabs` for a tooltip.
     */
    disabled?: boolean;
};
