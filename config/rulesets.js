/**
 * Include/exclude wildcard rules for selecting ORT ecosystem repositories
 * to catalog for Hora.
 *
 * @type {{
 *   includes: Array<string>
 *   excludes: Array<string>
 *   'turned-off': Array<string>
 * }}
 */
const RULESETS = {
  includes: [
    'renchan-*',
    'furo-*',
    'mentsu-*',
    'jest-*',
  ],
  excludes: [
    '*-archive',
    '*-boilerplate',
    '*-boilerplate-*',
    '*-sample',
    '*-sample-*',
    '*-tutorial',
    '*-tutorial-*',

    'mentsu-agent-loop-alpha',
    'mentsu-validators',

    'renchan-ai-estimation-app',
    'renchan-ai-estimation-app-*',
    'renchan-api',
    'renchan-prototype-app',
    'renchan-qdrant',
    'renchan-rag-app-backend-alpha',
    'renchan-rewards',
    'renchan-test-tools',
    'renchan-tools',
    'renchan-tools-anthropic-api-client',
    'renchan-tools-crypto-currency',
    'renchan-tools-external-api',
    'renchan-tools-http-request-client',
    'renchan-tools-http-status-codes-handler',
    'renchan-tools-stripe-api',
    'renchan-tutoril-*',
    'renchan-tutotiral-*',
  ],
  'turned-off': [
    'mentsu-action-value',
    'mentsu-agent-*',
    'mentsu-encipher',

    'renchan-dynamic-field-mutator',
    'renchan-list-view',
    'renchan-tools-aws-s3-client',
    'renchan-tools-coinpayments',
    'renchan-tools-mailgun-client',
    'renchan-tools-twilio',
    'renchan-tools-line-login-api',
    'renchan-tools-line-messaging-api',
  ],
}

export default RULESETS
