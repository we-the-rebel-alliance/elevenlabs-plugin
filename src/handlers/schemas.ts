import type { JsonSchema } from "@we-the-rebel-alliance/plugin-contract/manifest"

/** A method that takes no input of its own; the register adds the account selector. */
export const EMPTY_INPUT = { type: "object", properties: {}, additionalProperties: false } as const satisfies JsonSchema

export { PROBE_SCHEMA } from "@we-the-rebel-alliance/plugin-contract/events"
