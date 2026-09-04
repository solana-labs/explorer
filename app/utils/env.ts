/**
 * Checks if an environment variable is enabled by verifying if its value is exactly 'true'.
 * This is useful for boolean environment variables that are stored as strings in .env files.
 *
 * @param variable - The environment variable value to check (typically from process.env)
 * @returns Returns true if the variable value is exactly 'true', false otherwise
 * @example
 * // In .env file: FEATURE_FLAG=true
 * const isFeatureEnabled = isEnvEnabled(process.env.FEATURE_FLAG); // returns true
 *
 * // In .env file: DEBUG_MODE=false
 * const isDebugMode = isEnvEnabled(process.env.DEBUG_MODE); // returns false
 */
export function isEnvEnabled(variable: undefined | string) {
    return variable === 'true';
}

export const EXPLORER_BASE_URL = 'https://explorer.solana.com';

/** Closes the deployment for bots (staging): disallow-all robots.txt, 404 sitemaps, noindex header. */
export const isSeoDisallowBots = () => isEnvEnabled(process.env.SEO_DISALLOW_BOTS);
export const IBRL_EXPLORER_URL = process.env.NEXT_PUBLIC_IBRL_EXPLORER_URL || 'https://ibrl.wtf';
