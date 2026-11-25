import type { AccountState } from "@we-the-rebel-alliance/plugin-contract/accounts"
import type { Bus } from "@we-the-rebel-alliance/plugin-contract/bus"
import type { Owner } from "@we-the-rebel-alliance/plugin-contract/manifest"
import type { MethodCall } from "@we-the-rebel-alliance/plugin-contract/register"
import type { Provider } from "../../src/provider/elevenlabs.ts"

/** One conversation as the fake list answers it. */
export interface ConversationRow {
  readonly conversation_id: string
  readonly start_time_unix_secs: number
  readonly agent_id: string
  readonly agent_name: string
  readonly status: string
  readonly call_successful: string
  readonly direction: string
}

const ROWS: Readonly<Record<string, readonly ConversationRow[]>> = {
  work: [
    { conversation_id: "conv_work_1", start_time_unix_secs: 1_794_996_900, agent_id: "agent_checkout", agent_name: "Checkout", status: "done", call_successful: "success", direction: "inbound" },
    { conversation_id: "conv_work_2", start_time_unix_secs: 1_795_006_200, agent_id: "agent_checkout", agent_name: "Checkout", status: "failed", call_successful: "failure", direction: "outbound" },
    { conversation_id: "conv_work_3", start_time_unix_secs: 1_795_078_800, agent_id: "agent_support", agent_name: "Support", status: "done", call_successful: "success", direction: "inbound" },
  ],
  personal: [{ conversation_id: "conv_personal_1", start_time_unix_secs: 1_794_940_500, agent_id: "agent_notes", agent_name: "Notes", status: "done", call_successful: "success", direction: "inbound" }],
}

const OWNERS: Readonly<Record<string, Owner>> = {
  work: { id: "elevenlabs:credential:work", label: "Work sign-in", verified: false },
  personal: { id: "elevenlabs:credential:personal", label: "Personal sign-in", verified: false },
}

/** A deterministic two-alias ElevenLabs, with no network and no host. */
export interface FakeProvider extends Provider {
  setState(alias: string, state: AccountState): void
  /** Replace one alias's conversations, for a test that needs its own page shape. */
  setRows(alias: string, rows: readonly ConversationRow[]): void
  readonly calls: { readonly alias: string; readonly tool: string; readonly input: Record<string, unknown> }[]
}

/** The fake list's page cap: 100 unless a test asks the provider to page smaller. */
export interface FakeProviderOptions {
  readonly conversationPageSize?: number | undefined
}

export function createFakeProvider(options: FakeProviderOptions = {}): FakeProvider {
  const states = new Map<string, AccountState>([
    ["work", "ready"],
    ["personal", "ready"],
  ])
  const rows = new Map<string, readonly ConversationRow[]>(Object.entries(ROWS))
  const calls: { alias: string; tool: string; input: Record<string, unknown> }[] = []
  const provider: FakeProvider = {
    media: { root: "/tmp/elevenlabs-test", maxBytes: 1_024 * 1_024, hosts: ["elevenlabsusercontent.com"] },
    calls,
    nameOf: (alias) => (alias === "default" ? "elevenlabs" : `elevenlabs-${alias}`),
    setState(alias, state) {
      states.set(alias, state)
    },
    setRows(alias, next) {
      rows.set(alias, next)
    },
    async owner(alias) {
      if (states.get(alias) !== "ready") throw new Error(`no credential for ${alias}`)
      return OWNERS[alias] ?? { id: `elevenlabs:credential:${alias}`, label: `${alias} sign-in`, verified: false }
    },
    async signal(alias) {
      const state = states.get(alias) ?? "needs_sign_in"
      return state === "ready" ? { state, owner: await provider.owner(alias) } : { state }
    },
    read(alias, _call) {
      return async (tool, input) => {
        calls.push({ alias, tool, input })
        if (tool === "agents_list") return { agents: [{ agent_id: "agent_checkout" }, { agent_id: "agent_support" }], has_more: false }
        if (tool === "agents_get") return { agent_id: String(input["agent_id"]), platform_settings: { privacy: { retention_days: 730 } } }
        if (tool === "agents_list_conversations") {
          const ordered = [...(rows.get(alias) ?? [])]
          if (input["sort_direction"] === "desc") ordered.reverse()
          const requested = typeof input["page_size"] === "number" ? input["page_size"] : 100
          const size = Math.max(1, Math.min(requested, options.conversationPageSize ?? requested))
          const start = typeof input["cursor"] === "string" ? Number(input["cursor"]) : 0
          const from = Number.isSafeInteger(start) && start >= 0 ? start : 0
          const page = ordered.slice(from, from + size)
          const next = from + page.length < ordered.length ? String(from + page.length) : undefined
          return { conversations: page, ...(next === undefined ? {} : { next_cursor: next }), has_more: next !== undefined }
        }
        throw new Error(`the fake provider has no ${tool}`)
      }
    },
    async assertDirectory() {
      return undefined
    },
    async save(input) {
      return { path: `/tmp/elevenlabs-test/${input.name ?? "generated.mp3"}`, bytes: 1_024, sha256: "0".repeat(64), mime: "audio/mpeg" }
    },
  }
  return provider
}

/** A bus that records the events it was asked to emit. */
export function fakeBus(): { bus: Bus; events: { name: string; data: unknown }[] } {
  const events: { name: string; data: unknown }[] = []
  const bus = {
    async emit(name: string, data: unknown) {
      events.push({ name, data })
      return { ok: true as const }
    },
  } as unknown as Bus
  return { bus, events }
}

/** A method call as `register` would hand one to a handler. */
export function fakeCall(account: string, door: MethodCall["door"] = "rpc", bus?: Bus): MethodCall {
  const emitter = bus ?? fakeBus().bus
  return {
    sessionID: "ses_test",
    agent: "build",
    messageID: "msg_test",
    id: "call_test",
    signal: new AbortController().signal,
    progress: async () => undefined,
    account,
    bus: emitter,
    unguardedAgents: async () => ({ ok: true, agents: [] }),
    door,
  }
}
