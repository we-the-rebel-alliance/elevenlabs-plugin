import type { ErrorCode } from "@we-the-rebel-alliance/plugin-contract/events"

/**
 * A provider failure in the contract's one form: `CODE: What happened. Next step: What to do.` The register reads the
 * `code`, `what` and `next` fields and maps the error to the same refusal on every door. A code outside the contract's
 * table is never used here: the plugin raises no code of its own.
 */
export class ProviderError extends Error {
  readonly code: ErrorCode
  readonly what: string
  readonly next: string

  constructor(code: ErrorCode, what: string, next: string) {
    const clean = what.replace(/[.\s]+$/, "")
    super(`${code}: ${clean}. Next step: ${next}`)
    this.name = "ProviderError"
    this.code = code
    this.what = clean
    this.next = next
  }
}

/** The one-line reason of an unknown failure, for a status reason. The contract's redaction owns the cut. */
export const reasonOf = (error: unknown): string => (error instanceof Error ? error.message : String(error))
