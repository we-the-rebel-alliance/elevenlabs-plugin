import type { Plugin } from "@opencode/plugin"
import { accountsOf, registerAccounts, type AccountState } from "@we-the-rebel-alliance/plugin-contract/accounts"
import type { Bus } from "@we-the-rebel-alliance/plugin-contract/bus"
import type { Manifest } from "@we-the-rebel-alliance/plugin-contract/manifest"
import type { Provider } from "./provider/elevenlabs.ts"
import { serverConfig } from "./provider/elevenlabs.ts"

/** The part of the host context account registration uses: both transforms the accounts module takes. */
export interface AccountsHost {
  readonly mcp: Pick<Plugin.Context["mcp"], "transform">
  readonly integration: Pick<Plugin.Context["integration"], "transform">
}

/**
 * Register one vendor MCP server per alias, through the contract's accounts module. The alias's profile chooses its
 * region, so two aliases may sign in to two different ElevenLabs environments at once.
 */
export function registerFor(host: AccountsHost, manifest: Manifest, options: Readonly<Record<string, unknown>>) {
  return registerAccounts(host, {
    manifest,
    options,
    server: (account) => serverConfig(account.profile),
  })
}

/** The events that can change an alias's sign-in state. */
const WATCHED = ["integration.updated", "mcp.status.changed", "credential.updated", "credential.switched"] as const

const RESUBSCRIBE_MS = 5_000
const STARTUP_MS = 1_000

const delay = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal.aborted) return resolve()
    const done = () => {
      clearTimeout(timer)
      signal.removeEventListener("abort", done)
      resolve()
    }
    const timer = setTimeout(done, ms)
    signal.addEventListener("abort", done, { once: true })
  })

/** The host context the watcher reads: the event stream. */
export interface WatchHost {
  readonly event: Pick<Plugin.Context["event"], "subscribe">
  readonly mcp: Pick<Plugin.Context["mcp"], "list">
}

export interface WatchOptions {
  readonly manifest: Manifest
  readonly options: Readonly<Record<string, unknown>>
  readonly provider: Provider
  /** What registering the accounts could not do; a status nudge says `error` when it is not empty. */
  readonly problems: readonly string[]
  readonly bus: Bus
}

/** The watcher's one handle: a manual comparison, and the disposal of its subscription and timer. */
export interface AccountWatch {
  /** One comparison now; the first call only seeds it. */
  check(): Promise<void>
  stop(): Promise<void>
}

/**
 * Emit `account` when an alias's sign-in state changes, and `status` when the plugin's overall state does. It is a
 * nudge, never content: a consumer re-reads `status` or `probe`. The first snapshot only seeds the comparison, so a
 * plugin load does not send one event per alias. A failed subscription never takes the plugin down; it retries.
 */
export function watchAccounts(host: WatchHost, options: WatchOptions): AccountWatch {
  const stopped = new AbortController()
  const names = new Set<string>()
  const previous = new Map<string, AccountState>()
  let previousOverall: string | undefined
  const aliases = () => {
    const plan = accountsOf(options.manifest, options.options)
    return plan.ok ? plan.value.accounts.map((account) => account.alias) : []
  }
  for (const alias of aliases()) names.add(options.provider.nameOf(alias))
  const overall = (states: readonly AccountState[], problems: number) => (problems > 0 || states.includes("error") ? "error" : states.includes("needs_sign_in") ? "needs_sign_in" : "ready")

  const check = async (): Promise<void> => {
    const list = aliases()
    if (list.length === 0) return
    const current: { alias: string; state: AccountState }[] = []
    for (const alias of list) {
      const signal = await options.provider.signal(alias).catch(() => ({ state: "error" as const }))
      current.push({ alias, state: signal.state })
      const before = previous.get(alias)
      previous.set(alias, signal.state)
      if (before === undefined || before === signal.state) continue
      await options.bus.emit("account", { account: alias, state: signal.state }).catch(() => undefined)
    }
    const now = overall(
      current.map((entry) => entry.state),
      options.problems.length,
    )
    if (previousOverall !== undefined && previousOverall !== now) {
      await options.bus.emit("status", { state: now }).catch(() => undefined)
    }
    previousOverall = now
  }

  // One check at a time; a trigger that arrives meanwhile causes one more check after it.
  let running: Promise<void> | undefined
  let again = false
  const schedule = () => {
    if (running !== undefined) {
      again = true
      return
    }
    running = (async () => {
      do {
        again = false
        if (!stopped.signal.aborted) await check().catch(() => undefined)
      } while (again)
    })().finally(() => {
      running = undefined
    })
  }

  void (async () => {
    while (!stopped.signal.aborted) {
      try {
        const events = host.event.subscribe({ types: [...WATCHED], signal: stopped.signal })
        for await (const event of events) {
          const fired = event as { readonly type: string; readonly data?: { readonly server?: string } }
          if (fired.type === "mcp.status.changed" && fired.data?.server !== undefined && !names.has(fired.data.server)) continue
          schedule()
        }
      } catch {
        // The stream failed; check, then subscribe again.
      }
      if (!stopped.signal.aborted) schedule()
      await delay(RESUBSCRIBE_MS, stopped.signal)
    }
  })()

  const startup = setTimeout(() => schedule(), STARTUP_MS)
  startup.unref?.()

  return {
    check,
    async stop() {
      stopped.abort()
      clearTimeout(startup)
      await running
    },
  }
}
