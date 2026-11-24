// From the review of the estimate-first reconcile: the class of a tool that renders a view, the estimate probe's
// argument allowlist, and the ledger's expiry of remembered estimates. These are the behaviours that remain after the
// agent-path hooks were removed; the tools RPC's shaper tests cover the same pricing rules from a script's door.
import { describe, expect, test } from "bun:test"
import { Ledger, quoteCallSync, RESERVATION_MS, SpendRefused } from "../../src/billing.js"
import { classify, READ_TOOLS, WRITE_TOOLS } from "../../src/elevenlabs-tools.js"
import { defaultRules } from "../../src/permissions.js"

const caps = (session: number | null = 100_000, daily: number | null = 100_000) => ({ sessionCreditCap: session, dailyCreditCap: daily })
const call = (id = "c1", sessionID = "ses_a") => ({ sessionID, agent: "build", messageID: "m1", id })

const refusal = async (run: Promise<unknown> | (() => unknown)) => {
  const outcome = await (typeof run === "function" ? Promise.resolve().then(run) : run).then(
    () => undefined,
    (error: unknown) => error,
  )
  expect(outcome).toBeInstanceOf(SpendRefused)
  return outcome as SpendRefused
}

/** The effect the generated default rules give one tool at one `access`. */
const effectOf = (tool: string, access: "all" | "ask-changes" | "read-only") =>
  defaultRules(access).find((rule) => rule.action === `elevenlabs_${tool}`)?.effect

describe("a tool that renders a view is classed as ElevenLabs marks it", () => {
  // At e07ebfc `creative_show_flow_results` was in READ_TOOLS; it was then moved to the writes because its description
  // is an effect, rendering a run's generations to the user. The live capture of 2026-11-14 records ElevenLabs' own
  // readOnlyHint, true, and it changes nothing in the workspace, so it is a read again: the legacy declaration carries
  // that readOnly, and it follows the server unless a reason is written down (READ_ONLY_OVERRIDES).

  test("showing a run's results is a read, like reading the same run's status", () => {
    expect(classify("creative_show_flow_results")).toBe("read")
    expect(READ_TOOLS).toContain("creative_show_flow_results")
    expect(WRITE_TOOLS).not.toContain("creative_show_flow_results")
    expect(classify("creative_get_flow_run_status")).toBe("read")
  })

  test("it is allowed at every access, as every read is", () => {
    for (const access of ["all", "ask-changes", "read-only"] as const) {
      expect({ access, effect: effectOf("creative_show_flow_results", access) }).toEqual({ access, effect: "allow" })
      expect({ access, effect: effectOf("creative_get_flow_run_status", access) }).toEqual({ access, effect: "allow" })
    }
  })

  test("it is still priced by nothing: the class says what it may do, not what it costs", () => {
    // It generates nothing, so no cap touches it.
    const quote = quoteCallSync({ ledger: new Ledger(), caps: () => caps() }, "creative_show_flow_results", { flow_id: "flow_example" }, call())
    expect(quote).toEqual({ price: { credits: 0, basis: "exact", parts: [] }, tracked: false })
  })
})

describe("the free estimate probe is held to the same argument allowlist the paid call is", () => {
  // At e07ebfc both `quote` and `quoteSync` opened with `isEstimate(...) || !mustPrice(...)`, which returned ahead of
  // the allowlist check. An invented argument was forwarded to ElevenLabs on the probe, which the server rejects —
  // leaving a flow and a node behind for a call that answered nothing, the exact cost the check exists to avoid.
  const bogus = { prompt: "a mug", generations_count: 1, estimate_only: true, bogus_field: "x" }
  const sound = { prompt: "a mug", generations_count: 1, estimate_only: true }

  test("an argument ElevenLabs' schema does not have refuses the probe, while a cap is on", async () => {
    const run = () => quoteCallSync({ ledger: new Ledger(), caps: () => caps() }, "creative_generate_image", { ...bogus }, call())
    const failure = await refusal(run)
    expect(failure.code).toBe("PRICE_UNKNOWN")
    expect(failure.message).toContain(`"bogus_field" is an argument ElevenLabs' own schema for this tool does not have`)
    expect(failure.message).toContain("this probe was not sent")
    // Not `unknownPrice`'s next step: this caller already sent `estimate_only`, so telling them to send it is no step
    // at all. The argument is the thing to change.
    expect(failure.nextStep).toContain("Ask for the estimate again without that argument")
    expect(failure.nextStep).not.toContain(`once with "estimate_only": true`)
  })

  test("a sound probe still runs free: not priced, not reserved, not charged", () => {
    const ledger = new Ledger()
    const quote = quoteCallSync({ ledger, caps: () => caps() }, "creative_generate_image", { ...sound }, call())
    expect(quote).toEqual({ price: { credits: 0, basis: "exact", parts: [] }, tracked: false })
    expect(ledger.daily()).toBe(0)
    expect(quoteCallSync({ ledger, caps: () => caps() }, "creative_generate_image", { ...sound }, call())).toMatchObject({ tracked: false })
    expect(ledger.daily()).toBe(0)
  })

  test("with both caps off nothing is checked here either, as everywhere else", () => {
    const off = { ledger: new Ledger(), caps: () => caps(null, null) }
    expect(quoteCallSync(off, "creative_generate_image", { ...bogus }, call())).toMatchObject({ tracked: false })
  })

  test("the paid call carrying that argument was already refused, so no figure could ever have paid for one", async () => {
    // Why the review filed this as a nit and not as money: the probe's figure is keyed by its arguments, and the paid
    // call with those arguments is refused before any remembered price is read.
    const { bogus_field, estimate_only, ...rest } = { ...bogus }
    const failure = await refusal(() => quoteCallSync({ ledger: new Ledger(), caps: () => caps() }, "creative_generate_image", { ...rest, bogus_field }, call()))
    expect(failure.code).toBe("PRICE_UNKNOWN")
    expect(failure.message).toContain(`"bogus_field"`)
    expect(estimate_only).toBe(true)
  })
})

describe("a remembered estimate is dropped when it expires, not kept for the life of the process", () => {
  // At e07ebfc `prune` aged `book.own` and `book.folded` and never touched `remembered`. `rememberedPrice` refused
  // to return a stale entry but left it in the Map, and its key is the tool name plus the stable JSON of every
  // argument — so the whole prompt stayed in memory until the process ended.
  //
  // The Map is private, and its size is the finding: a stale entry cannot be observed through the public answer,
  // because that answer was already correct. So the test reads the field the review named.
  const sizeOf = (ledger: Ledger) => (ledger as unknown as { remembered: Map<string, unknown> }).remembered.size
  const price = { credits: 10, basis: "exact" as const, parts: [] }

  test("estimates past their ten minutes are gone from the Map, not merely refused", () => {
    let now = 0
    const ledger = new Ledger({ now: () => now })
    ledger.rememberPrice("creative_generate_speech", { prompt: "the first secret" }, price)
    ledger.rememberPrice("creative_generate_speech", { prompt: "the second secret" }, price)
    expect(sizeOf(ledger)).toBe(2)
    // Still fresh: nothing is dropped, and the figure is still usable.
    now += RESERVATION_MS - 1
    ledger.rememberPrice("creative_generate_image", { prompt: "a mug" }, price)
    expect(sizeOf(ledger)).toBe(3)
    expect(ledger.rememberedPrice("creative_generate_speech", { prompt: "the first secret" })).toEqual(price)
    // Past the window the two speech prompts can price nothing, so they are not kept.
    now += 2
    ledger.rememberPrice("creative_generate_video", { prompt: "a river" }, price)
    expect(sizeOf(ledger)).toBe(2)
    expect(ledger.rememberedPrice("creative_generate_speech", { prompt: "the first secret" })).toBeUndefined()
    expect(ledger.rememberedPrice("creative_generate_image", { prompt: "a mug" })).toEqual(price)
  })

  test("the ledger's own sweep drops them too, so a session that settles a call does not need to estimate again", async () => {
    let now = 0
    const ledger = new Ledger({ now: () => now })
    ledger.rememberPrice("creative_generate_speech", { prompt: "a secret" }, price)
    expect(sizeOf(ledger)).toBe(1)
    now += RESERVATION_MS + 1
    // `settle` prunes; before the fix this swept the book and left the prompt behind.
    await ledger.record("ses_a", 1)
    expect(sizeOf(ledger)).toBe(0)
  })

  test("a fresh estimate is never dropped by another tool's sweep", () => {
    let now = 0
    const ledger = new Ledger({ now: () => now })
    ledger.rememberPrice("creative_generate_speech", { prompt: "a secret" }, price)
    now += 60_000
    ledger.rememberPrice("creative_generate_image", { prompt: "a mug" }, price)
    expect(sizeOf(ledger)).toBe(2)
    expect(ledger.rememberedPrice("creative_generate_speech", { prompt: "a secret" })).toEqual(price)
  })
})
