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
    'renchan-rag-app-backend-alpha',
    'renchan-rewards',
    'renchan-tools',
    'renchan-tools-crypto-currency',
    'renchan-tools-external-api',
    'renchan-tools-http-request-client',
    'renchan-tools-http-status-codes-handler',
    'renchan-tools-stripe-api',
    'renchan-tutoril-duong',
    'renchan-tutotiral-khoa',
  ],
  'turned-off': [
    'mentsu-agent-*',

    'renchan-dynamic-field-mutator',
    'renchan-tools-twilio',
    'renchan-tools-line-login-api',
    'renchan-tools-line-messaging-api',
  ],
}

export default RULESETS
