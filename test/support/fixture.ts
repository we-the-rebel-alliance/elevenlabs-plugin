import { watchAccounts, type WatchHost } from "../../src/accounts.ts"
import { createHandlers } from "../../src/handlers/index.ts"
import { manifest } from "../../src/manifest.ts"
import type { Provider } from "../../src/provider/elevenlabs.ts"
import { createFakeProvider, fakeBus, fakeCall } from "./fake-provider.ts"

/** The clock every recorded answer was made at. */
export const NOW = Date.parse("2026-11-20T12:00:00.000Z")

/** The two synthetic aliases and their regions. */
export const OPTIONS = { access: "all", accounts: { work: { region: "eu" }, personal: { region: "global" } } } as const

const iAm = (account: string) => fakeCall(account)

/** A host whose event stream never yields until it is stopped; `watchAccounts.check()` drives the recording. */
function quietHost() {
  return {
    event: {
      subscribe: (options: { readonly signal?: AbortSignal }) => {
        const signal = options.signal
        return (async function* () {
          if (signal === undefined) return
          await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true }))
        })()
      },
    },
    mcp: { list: async () => ({ data: [] }) },
  }
}

/**
 * The conformance fixture's evidence, built by running the plugin's own handlers against a deterministic two-alias
 * provider. `test/unit/fixture.test.ts` builds it again and compares, so the committed file cannot drift from the
 * answers the code gives.
 */
export async function buildFixture() {
  const provider = createFakeProvider()
  const handlers = createHandlers({ manifest, options: OPTIONS, provider, hostVersion: "2.4.1", accountProblems: [], now: () => NOW })

  const page = await handlers.events_list!.run({ source: "elevenlabs", since: "2026-11-18T00:00:00Z", account: "work" }, iAm("work"))
  const empty = await handlers.events_list!.run({ source: "elevenlabs", cursor: (page as { cursor: string }).cursor, account: "work" }, iAm("work"))
  const personal = await handlers.events_list!.run({ source: "elevenlabs", since: "2026-11-17T00:00:00Z", account: "personal" }, iAm("personal"))
  const snapshot = await handlers.events_list!.run({ source: "elevenlabs", list: "conversations", account: "work" }, iAm("work"))
  const probe = await handlers.probe!.run({}, iAm("work"))
  const status = await handlers.status!.run({}, iAm("work"))

  // The watcher's two nudges: seed both aliases ready, then make one need a sign-in. The recording proves each
  // declared event is one the plugin actually emits.
  const { bus, events } = fakeBus()
  const changing = createFakeProvider()
  const watcher = watchAccounts(quietHost() as unknown as WatchHost, { manifest, options: OPTIONS, provider: changing, problems: [], bus })
  await watcher.check()
  changing.setState("personal", "needs_sign_in")
  await watcher.check()
  await watcher.stop()
  const emitted = [...new Set(events.map((event) => event.name))]

  return {
    $comment:
      "Recorded from the plugin's own handlers against a deterministic two-account provider: two MCP aliases, the conversations events source and its list snapshot, probe and status. No real person, call or credential appears.",
    plugin: "@we-the-rebel-alliance/elevenlabs-plugin",
    namespace: manifest.plugin.summary,
    accounts: {
      real: false,
      aliases: ["work", "personal"],
      required: { method: "events_list", code: "ACCOUNT_REQUIRED" },
      unknown: { method: "events_list", account: "nobodyhere", code: "ACCOUNT_UNKNOWN" },
      cursors: [{ method: "events_list", account: "work", other: "personal", code: "CURSOR_INVALID" }],
    },
    sources: {
      "elevenlabs.conversations": {
        cases: [
          { name: "the work account since the 18th", input: { source: "elevenlabs", since: "2026-11-18T00:00:00Z", account: "work" }, expect: "page", answer: page },
          { name: "the same cursor again", input: { source: "elevenlabs", cursor: (page as { cursor: string }).cursor, account: "work" }, expect: "empty", answer: empty },
          { name: "the personal account since the 17th", input: { source: "elevenlabs", since: "2026-11-17T00:00:00Z", account: "personal" }, expect: "page", answer: personal },
        ],
        probe: { answer: probe },
      },
      "elevenlabs.conversations.list": {
        snapshot: { answer: snapshot },
        probe: { answer: probe },
      },
    },
    events: { emitted, status },
    rpc: { inputs: { save_media: { url: "https://elevenlabsusercontent.com/generated.mp3" } } },
  }
}
