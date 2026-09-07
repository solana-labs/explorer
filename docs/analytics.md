# Analytics

## Interactive IDL Feature Funnel

The Interactive IDL (Anchor) feature tracks user engagement through the following funnel:

```
tab_opened → [wallet_connected ↔ sections_expanded] → transaction_submitted → transaction_confirmed/failed
```

> **Note:** `wallet_connected` and `sections_expanded` may occur in any order - user can expand sections before connecting wallet or vice versa.

### Events

| Event                   | Parameters                                                   |
| ----------------------- | ------------------------------------------------------------ |
| `tab_opened`            | `program_id`                                                 |
| `wallet_connected`      | `program_id`, `wallet_type`                                  |
| `sections_expanded`     | `program_id`, `expanded_sections`, `expanded_sections_count` |
| `transaction_submitted` | `program_id`, `instruction_name`                             |
| `transaction_confirmed` | `program_id`, `instruction_name`, `transaction_signature`    |
| `transaction_failed`    | `program_id`, `instruction_name`, `error_message`            |

All events are prefixed with `iidl_anchor_`.

> GA4 event names must be <= 40 characters. This is enforced at compile time via the `GA4EventName` type in ../app/shared/lib/analytics/types.ts

## Receipt Feature Funnel

The Receipt feature tracks user engagement through the following funnel:

```
button_clicked → receipt_viewed / no_receipt → view_tx_clicked
```

### Events

| Event             | Parameters                              |
| ----------------- | --------------------------------------- |
| `button_clicked`  | `signature`                             |
| `viewed`          | `signature`, `receipt_type` (sol/token) |
| `no_receipt`      | `signature`                             |
| `view_tx_clicked` | `signature`                             |

All events are prefixed with `rcpt_`.

## Search Tracking

Tracks search usage.

### Events

| Event                  | Parameters                       |
| ---------------------- | -------------------------------- |
| `srch_performed`       | `query_length`, `results_count`  |
| `srch_result_selected` | `result_type`, `result_verified` |

All events are prefixed with `srch_`.

- `query_length`: length of the trimmed search query (no raw query to avoid logging addresses/keys)
- `results_count`: total number of results across all groups returned
- `result_type`: entity type derived from the result pathname (e.g. `address`, `tx`, `block`, `epoch`, `validator`)
- `result_verified`: whether the selected result has a verified badge

## Refresh Button Tracking

Tracks usage of the Refresh button across the Explorer.

### Events

| Event            | Parameters |
| ---------------- | ---------- |
| `button_clicked` | `section`  |

All events are prefixed with `rfsh_`.

The `section` parameter identifies the page surface where the button was clicked. Each call site provides a hardcoded literal (e.g. `transaction_card`, `token_mint_card`, `vote_account_section`, `token_history_card`). Shared components (`AccountHeader`, `HistoryCardHeader`) accept an explicit `analyticsSection` prop so the tracked value is decoupled from display text.

## Web Vitals

Real-user performance is reported to two independent sinks from the `app/@analytics/` slot:

- **Vercel Speed Insights** — `@vercel/speed-insights/next`, sampled at 10%. Core Web Vitals with route, country, and element breakdowns in the Vercel dashboard. Requires Speed Insights Plus for the individual metrics, which is included on the Enterprise plan.
- **GA4** — `useReportWebVitals` from `next/web-vitals`, unsampled, so the vitals sit alongside the funnels above.

The two sit on opposite sides of the cookie consent gate. Speed Insights writes nothing to the device — no cookie, no storage, no client-generated identifier — so the banner, which exists to cover cookies, does not reach it and it runs ungated. The GA4 path feeds gtag, so it stays behind consent along with the GA and GTM scripts.

The GA4 reporter also waits for the tag script's `onReady` before it subscribes. `trackEvent` drops an event when neither `gtag` nor `dataLayer` exists yet, and buffered vitals arrive the instant the reporter subscribes — earlier than an `afterInteractive` script can load. Waiting costs nothing, because `PerformanceObserver` replays entries it already saw.

### Events

| Event     | Parameters                      | Metric                    |
| --------- | ------------------------------- | ------------------------- |
| `wv_lcp`  | `metric_rating`, `metric_value` | Largest Contentful Paint  |
| `wv_inp`  | `metric_rating`, `metric_value` | Interaction to Next Paint |
| `wv_cls`  | `metric_rating`, `metric_value` | Cumulative Layout Shift   |
| `wv_fcp`  | `metric_rating`, `metric_value` | First Contentful Paint    |
| `wv_ttfb` | `metric_rating`, `metric_value` | Time to First Byte        |

All events are prefixed with `wv_`.

- `metric_rating`: `good`, `needs-improvement`, or `poor`, as classified by the `web-vitals` library
- `metric_value`: milliseconds rounded to a whole number, except `wv_cls`, which is a unitless ratio kept to four decimal places

`useReportWebVitals` also emits the deprecated First Input Delay (FID); INP replaced it, so it is dropped rather than given an event name.

### Reading the numbers

Speed Insights sees every visitor, so its numbers are the ones to trust for country and route comparisons.

The GA4 events are a consent-gated subset. Non-EU visitors are auto-granted, but an EU visitor who ignores the banner never grants consent and contributes nothing, so the EU slice is thin and skewed toward people who click. Consent granted part-way through a page load loses less than it looks: `web-vitals` registers buffered `PerformanceObserver`s, so paint and layout entries from before the mount still arrive.
