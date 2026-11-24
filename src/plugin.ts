import { Plugin, type Mcp } from "@opencode/plugin"
import { readBalance, readKey, registerBalanceIntegration } from "./balance.js"
import { Ledger, LEDGER_REFRESH_MS, type Caps } from "./billing.js"
import {
  DISPLAY_NAME,
  errorText,
  MEDIA_HOSTS,
  NAMESPACE_DESCRIPTION,
  OAUTH_SCOPES,
  PLUGIN_ID,
  REGIONS,
  SERVER_NAME,
} from "./constants.js"
import { runDoctor } from "./doctor.js"
import { eventsMethod, probeMethod, registerEvents, type EventsState } from "./events.js"
import { checkHost } from "./host-version.js"
import { registerToolsRpc, setToolRuntime, shapersFor, METHODS, type ToolRuntime } from "./host/tools-rpc.js"
import { watchIntegration } from "./integration.js"
import { addSaveTool } from "./media/tool.js"
import { findOldSignIns, registerOldSignIns } from "./old-sign-ins.js"
import { parseOptions, type ParsedOptions } from "./options.js"
import { reasonOf } from "./redact.js"
import { defaultRules, registerDefaultRules } from "./permissions.js"
import { loadSkills, registerSkills } from "./skills.js"
import { readStatus, registerStatusCommand, registerStatusRpc, type ServerSource, type SpendFacts } from "./status.js"

/** Internal seam: tests point the server at a loopback fake without OAuth, at their own skills and media hosts. */
interface ElevenlabsSeam {
  readonly endpoint?: string
  readonly oauth?: false
  readonly skillsDir?: string
  /** Extra hosts a media link may name. Only a test seam adds one; the plugin's own list is ElevenLabs'. */
  readonly mediaHosts?: readonly string[]
  readonly fetch?: typeof fetch
}

type RemoteConfig = Extract<Mcp.ServerConfig, { type: "remote" }>

/**
 * No oauth block beyond the scope pin: OpenCode chooses CIMD and runs the sign-in itself. ElevenLabs advertises eight
 * scopes; the pin is the seven its own MCP client asks for, so `ads_read` is never requested. No protocol, codemode,
 * timeout or headers: the host defaults apply.
 */
export const serverConfig = (url: string, seam: ElevenlabsSeam): RemoteConfig => ({
  type: "remote",
  url,
  ...(seam.oauth === false ? { oauth: false as const } : { oauth: { scope: OAUTH_SCOPES } }),
})

/**
 * Origin and path only, so a token in a query string never reaches status.
 */
export function displayUrl(url: string) {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return "an invalid URL"
  }
}

/**
 * A conflicting server's address for status. Another origin shows only its origin, because its path can hold a secret.
 */
export function conflictUrl(url: string, expected: string) {
  try {
    const parsed = new URL(url)
    if (parsed.origin === new URL(expected).origin) return displayUrl(url)
    return parsed.pathname === "/" ? parsed.origin : `${parsed.origin}/…`
  } catch {
    return "an invalid URL"
  }
}

/** The region a URL belongs to, when it is one of the five the plugin knows. */
export function regionOf(url: string) {
  const shown = displayUrl(url)
  return (Object.keys(REGIONS) as (keyof typeof REGIONS)[]).find((region) => REGIONS[region] === shown)
}

/** A server name plain enough to print: the characters an MCP server name is made of, and never this plugin's own. */
const SAFE_SERVER = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/
/** At most this many other entries are named; the point is made by the first few. */
const LISTED_OTHERS = 5

/**
 * The other `mcp.servers` entries that point at one of ElevenLabs' own addresses. OpenCode treats each as its
 * own server with its own tool prefix, so this plugin does not see their calls and its tools-RPC caps do not bind
 * them. Nothing is changed: a second entry is the owner's to keep, and status only names it.
 */
export function otherElevenlabsServers(entries: readonly (readonly [string, { readonly type: string; readonly url?: string }])[]) {
  return entries
    .filter(([name, config]) => name !== SERVER_NAME && config.type === "remote" && typeof config.url === "string" && regionOf(config.url) !== undefined)
    .map(([name]) => name)
    .filter((name) => SAFE_SERVER.test(name))
    .slice(0, LISTED_OTHERS)
}

/**
 * Registers `elevenlabs`, or adopts the user's own `mcp.servers.elevenlabs` unchanged when it points at exactly the
 * selected region's URL: user config is applied first, and a later `set` would replace it. Another region's URL is
 * `stale` — a region change leaves an old entry behind, and status gives one next step for it. Any other URL is a
 * conflict, and nothing is added. Synchronous and never throws.
 */
export function registerServer(
  mcp: Pick<Plugin.Context["mcp"], "transform">,
  config: RemoteConfig,
  record: (source: ServerSource | undefined, problem?: string, others?: readonly string[]) => void,
) {
  return mcp.transform((editor) => {
    try {
      const existing = editor.get(SERVER_NAME)
      const expected = displayUrl(config.url)
      // Read beside the entry this plugin owns: another entry at ElevenLabs' address is outside the caps, and status
      // says so. Listing is all that happens; the entry is the owner's.
      const others = otherElevenlabsServers(editor.list())
      if (!existing) {
        editor.set(SERVER_NAME, config)
        return record({ type: "plugin", url: expected }, undefined, others)
      }
      if (existing.type === "remote" && displayUrl(existing.url) === expected) return record({ type: "adopted", url: expected }, undefined, others)
      const stale = existing.type === "remote" && regionOf(existing.url) !== undefined
      // A stale entry is one of ElevenLabs' own addresses, so its full URL is safe and the next step needs it; another
      // server's path can hold a secret and is reduced to its origin.
      const url = stale && existing.type === "remote" ? displayUrl(existing.url) : existing.type === "remote" ? conflictUrl(existing.url, config.url) : "a local command"
      record({ type: stale ? "stale" : "conflict", url, expected }, undefined, others)
    } catch (error) {
      record(undefined, errorText("SERVER_NOT_REGISTERED", `The ${SERVER_NAME} MCP server could not be registered (${reasonOf(error)}).`, "Restart OpenCode."))
    }
  })
}

export function createElevenlabsPlugin(seam: ElevenlabsSeam = {}) {
  return Plugin.define({
    id: PLUGIN_ID,
    async setup(ctx) {
      const options: ParsedOptions = parseOptions(ctx.options)
      const host = checkHost(ctx.app.version, options.allowUntestedHost)
      const { skills, problems: skillProblems } = await loadSkills(seam.skillsDir)
      // Transforms replay on every rebuild, so each one overwrites its own entry rather than appending.
      const problems = new Map<string, string>(skillProblems.map((problem, index) => [`skill:${index}`, problem]))
      const report = (area: string) => (problem: string | undefined) => void (problem ? problems.set(area, problem) : problems.delete(area))
      let source: ServerSource | undefined
      let otherServers: readonly string[] = []

      const url = seam.endpoint ?? REGIONS[options.region]
      const ledger = new Ledger({ storage: ctx.storage })
      await ledger.hydrate()
      // The setup read above is one moment, and a process that spends nothing never takes another: its book would
      // decide for the rest of its life from what the store held when it started. This timer is what bounds that —
      // the book another OpenCode's spending is read into is at most one interval old. It is unref'd, so it
      // never holds the process open, and it is stopped when the plugin is disposed.
      const refreshing = setInterval(() => ledger.catchUp(), LEDGER_REFRESH_MS)
      refreshing.unref?.()
      const caps = (): Caps => ({ sessionCreditCap: options.sessionCreditCap, dailyCreditCap: options.dailyCreditCap })
      const mediaHosts = [...MEDIA_HOSTS, ...(seam.mediaHosts ?? [])]

      await registerServer(ctx.mcp, serverConfig(url, seam), (next, problem, others) => {
        source = next
        otherServers = others ?? []
        report("server")(problem)
      })
      // Code Mode's catalog describes the namespace with this text, unless the server is someone else's; the plugin's
      // own tool lives in the same namespace and is added once.
      // `managed` decides whether this plugin owns the server entry: it may rename it and add its namespace and tool.
      const managed = () => source?.type === "plugin" || source?.type === "adopted"
      await ctx.tool.transform((editor) => {
        if (!managed()) return
        editor.namespace({ name: SERVER_NAME, description: NAMESPACE_DESCRIPTION })
        addSaveTool({
          root: options.mediaRoot,
          maxBytes: options.maxMediaBytes,
          hosts: mediaHosts,
          assert: ctx.permission.assert,
          ...(seam.fetch === undefined ? {} : { fetch: seam.fetch }),
        })(editor)
      })
      // The source contract's events_list, as a tool beside ElevenLabs' own (src/events.ts); probe is a tools-RPC method only.
      const sourceState: EventsState = { managed, disabled: () => options.conversations === "off" }
      await registerEvents(ctx, sourceState)
      await registerDefaultRules(ctx.agent, defaultRules(options.access, options.conversations), report("rules"))
      await registerBalanceIntegration(ctx.integration)
      // A region change leaves the earlier region's sign-in stored and unlisted. The plugin cannot delete it, so it lists
      // it in /connect under a name that says what it is, where it can be signed out of, and status gives the command.
      await registerOldSignIns(ctx.integration, await findOldSignIns(ctx.integration, options.region).catch(() => []))

      // The balance is read only when the user added a key, and a failure is a problem for status, never a failed status.
      let balance: SpendFacts["balance"]
      const readSpend = async (): Promise<SpendFacts> => {
        const key = await readKey(ctx.integration).catch(() => undefined)
        if (key !== undefined) {
          try {
            balance = await readBalance(key)
          } catch (error) {
            balance = undefined
            report("balance")(error instanceof Error ? error.message : String(error))
          }
        } else {
          balance = undefined
          report("balance")(undefined)
        }
        const left = ledger.spend("")
        return { dailyCredits: left.dailyCredits, sessionCap: options.sessionCreditCap, dailyCap: options.dailyCreditCap, ...(balance === undefined ? {} : { balance }) }
      }
      const own = skills.map(({ name, path }) => ({ name, path }))
      const read = () =>
        readStatus(ctx, {
          access: options.access,
          conversations: options.conversations,
          region: options.region,
          oldSignIns: () => findOldSignIns(ctx.integration, options.region),
          mediaRoot: options.mediaRoot,
          spend: readSpend,
          ...(source ? { source } : {}),
          otherServers,
          host,
          skills: own,
          problems: [...problems.values()],
        })
      await registerSkills(ctx.skill, skills)
      await registerStatusCommand(ctx, read)
      await registerStatusRpc(ctx.rpc, read)

      // The doctor: the live checks a status report cannot make. It acts, so it is its own command.
      await ctx.command.transform((editor) =>
        editor.add({
          name: "elevenlabs-doctor",
          description: "Check ElevenLabs' address, sign-in discovery, tools, skills, media folder and spend",
          execute: async ({ sessionID }) => {
            const text = await runDoctor(ctx, {
              region: options.region,
              access: options.access,
              conversations: options.conversations,
              mediaRoot: options.mediaRoot,
              maxMediaBytes: options.maxMediaBytes,
              host,
              spend: await readSpend(),
              skills: own,
              ...(balance === undefined ? {} : { balance }),
              problems: [...problems.values()],
              ...(seam.fetch === undefined ? {} : { fetch: seam.fetch }),
            }).catch((error: unknown) => `${errorText("STATUS_UNAVAILABLE", `The doctor could not finish (${reasonOf(error)}).`, "Run /elevenlabs-status, then try again.")}`)
            await ctx.session.synthetic({ sessionID, text, description: `${DISPLAY_NAME} doctor`, resume: false })
          },
        }),
      )

      // Scripts call the known tools with no model, as a session and its agent, under the same ledger and caps.
      const save = { root: options.mediaRoot, maxBytes: options.maxMediaBytes, hosts: mediaHosts, assert: ctx.permission.assert, ...(seam.fetch === undefined ? {} : { fetch: seam.fetch }) }
      const runtime: ToolRuntime = { ledger, caps, save }
      setToolRuntime(runtime)
      const stopTools = await registerToolsRpc(ctx, {
        methods: [...METHODS, eventsMethod(ctx, sourceState), probeMethod(ctx, sourceState)],
        mcp: { server: SERVER_NAME, managed: () => source?.type !== "conflict" },
        // The shapers are this location's own, so a second location never prices or saves with the first one's ledger.
        shapers: shapersFor(runtime),
      })

      const stopWatch = watchIntegration(ctx, managed)
      return async () => {
        clearInterval(refreshing)
        setToolRuntime(undefined)
        await stopWatch()
        await stopTools()
      }
    },
  })
}


