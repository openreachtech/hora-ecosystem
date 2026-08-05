/**
 * Target repositories of the ORT ecosystem (renchan-/furo-/mentsu-) to
 * catalog for Hora.
 *
 * Repositories excluded by config/rulesets.js are omitted entirely, not
 * listed as `false`. Repositories matching `turned-off` are listed with
 * value `false`.
 *
 * @type {Record<string, boolean>}
 */
const TARGET_REPOSITORIES = {
  'furo-core': true,
  'furo-nuxt': true,
  'furo-vue': true,
  'jest-constructor-spy': true,
  'jest-deep-containing': true,
  'jest-expect-each': true,
  'mentsu-agent-loop-core': false, // ❌️
  'mentsu-agent-loop-graphql': false, // ❌️
  'mentsu-agent-loop-renchan-job': false, // ❌️
  'mentsu-bound-ctor-registry': true,
  'mentsu-deep-loader': true,
  'mentsu-deep-value-converter': true,
  'mentsu-field-path-value-extractor': true,
  'mentsu-gene-chain-splicer': true,
  'mentsu-logger': true,
  'mentsu-mixin-builder': true,
  'mentsu-path-group-schema': true,
  'mentsu-process-clerk': true,
  'mentsu-random-text-generator': true,
  'mentsu-rocket-client': true,
  'mentsu-rootpath': true,
  'mentsu-schema': true,
  'mentsu-search-condition': true,
  'mentsu-text-case-tools': true,
  'mentsu-validation-rules': true,
  'mentsu-value-inspector': true,
  'mentsu-value-normalizer': true,
  'renchan-core': true,
  'renchan-dynamic-field-mutator': false, // ❌️
  'renchan-elasticsearch': true,
  'renchan-env': true,
  'renchan-funnel': true,
  'renchan-job-bullmq': true,
  'renchan-kafka': true,
  'renchan-replica-fragments': true,
  'renchan-sequelize': true,
  'renchan-tools-line-login-api': false, // ❌️
  'renchan-tools-line-messaging-api': false, // ❌️
  'renchan-tools-twilio': false, // ❌️
}

export default TARGET_REPOSITORIES
