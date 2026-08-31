import { isEnvEnabled } from '@utils/env';

const DEFAULT_IDEA_ISSUES_URL = 'https://github.com/solana-foundation/explorer/issues/new?template=feature_request.yml';
const DEFAULT_BUG_ISSUES_URL = 'https://github.com/solana-foundation/explorer/issues/new?template=bug_report.yml';

export const FEEDBACK_ISSUES_URL = process.env.NEXT_PUBLIC_FEEDBACK_ISSUES_URL || DEFAULT_IDEA_ISSUES_URL;

export const BUG_REPORT_ISSUES_URL = process.env.NEXT_PUBLIC_FEEDBACK_BUG_ISSUES_URL || DEFAULT_BUG_ISSUES_URL;

// Feature flag: the whole widget (floating trigger + footer trigger) is hidden unless set to 'true'.
export const isFeedbackWidgetEnabled = () => isEnvEnabled(process.env.NEXT_PUBLIC_FEEDBACK_ENABLED);

// Without a client DSN captureFeedback is a silent no-op, so the form is hidden entirely.
export const isFeedbackEnabled = () => Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
