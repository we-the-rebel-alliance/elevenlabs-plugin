import type { Plugin } from "@opencode/plugin"
import { accountName, type AccountProfile, type AccountSignal } from "@we-the-rebel-alliance/plugin-contract/accounts"
import type { Owner } from "@we-the-rebel-alliance/plugin-contract/manifest"
import { ProviderError, reasonOf } from "../errors.ts"
import { saveMedia, type Saved, type SaveInput } from "./media.ts"

/**
 * ElevenLabs' hosted MCP server, one address per region. `global` is the default; every address is fixed here, so no
 * plugin option can point a server anywhere else. This module is the one place the provider's URLs are named.
 */
export const REGIONS = {
  global: "https://api.elevenlabs.io/v1/mcp",
  us: "https://api.us.elevenlabs.io/v1/mcp",
  eu: "https://api.eu.residency.elevenlabs.io/v1/mcp",
  in: "https://api.in.residency.elevenlabs.io/v1/mcp",
  sg: "https://api.sg.residency.elevenlabs.io/v1/mcp",
} as const

export type Region = keyof typeof REGIONS
export const REGION_VALUES = Object.keys(REGIONS) as readonly Region[]
export const DEFAULT_REGION: Region = "global"

/** The five regions a profile may name, or the default one. */
export function regionOf(profile: AccountProfile["profile"]): Region {
  const named = (profile as { readonly region?: unknown } | undefined)?.region
  return typeof named === "string" && (REGION_VALUES as readonly string[]).includes(named) ? (named as Region) : DEFAULT_REGION
}

/** The endpoint one alias's server reads. */
export const endpointFor = (profile: AccountProfile["profile"]): string => REGIONS[regionOf(profile)]

/**
 * The scopes OpenCode asks for. ElevenLabs advertises eight and this plugin has no advertising tool, so the pin is the
 * seven ElevenLabs' own MCP client asks for; OpenCode sends `oauth.scope` as written when it is set.
 */
export const OAUTH_SCOPES =
  "convai_read convai_write text_to_speech speech_history_read flows image_video_generation voice_generation"

/** The only host a generated file's signed link may point at. */
export const MEDIA_HOSTS: readonly string[] = ["elevenlabsusercontent.com"]

/** Where save_media writes by default, and the largest file it writes. */
export const DEFAULT_MEDIA_ROOT = "~/Downloads/elevenlabs"
export const DEFAULT_MEDIA_BYTES = 200 * 1024 * 1024

/** The MCP server config for one alias's profile, named by the accounts module. */
export function serverConfig(profile: AccountProfile["profile"]) {
  return { type: "remote" as const, url: endpointFor(profile), oauth: { scope: OAUTH_SCOPES } }
}

/** The contract's owner for a sign-in ElevenLabs itself never names: scheme, the credential's id, `verified: false`. */
export function ownerOf(credential: { readonly id: unknown; readonly label?: unknown }): Owner {
  const id = String(credential.id ?? "").trim()
  const label = typeof credential.label === "string" ? credential.label.replace(/\p{Cc}+/gu, " ").trim() : ""
  return { id: `elevenlabs:credential:${encodeURIComponent(id)}`, label: label || "ElevenLabs sign-in", verified: false }
}

/** What a provider call knows: the session and agent it runs as, and the call's own source for an ask. */
export interface ToolCall {
  readonly sessionID: string
  readonly agent: string
  readonly messageID: string
  readonly id: string
  readonly signal?: AbortSignal
}

/** One ElevenLabs tool, by name, executed as the calling session: its answer's JSON. */
export type Read = (tool: string, input: Record<string, unknown>) => Promise<unknown>

type Tool = Awaited<ReturnType<Plugin.Context["tool"]["list"]>>[number]
type ToolResult = Awaited<ReturnType<Tool["execute"]>>

/** The part of the host context the provider reads. */
export interface ProviderHost {
  readonly mcp: Pick<Plugin.Context["mcp"], "list">
  readonly integration: { readonly connection: Pick<Plugin.Context["integration"]["connection"], "active"> }
  readonly tool: Pick<Plugin.Context["tool"], "list">
  readonly permission: Pick<Plugin.Context["permission"], "assert">
}

/** Where a save writes and how much; setup decides both from the options. */
export interface MediaOptions {
  readonly root: string
  readonly maxBytes: number
  readonly hosts: readonly string[]
  readonly fetch?: typeof fetch
}

/** One plugin instance's view of ElevenLabs. */
export interface Provider {
  readonly media: MediaOptions
  nameOf(alias: string): string
  owner(alias: string): Promise<Owner>
  signal(alias: string): Promise<AccountSignal>
  read(alias: string, call: ToolCall): Read
  assertDirectory(call: ToolCall, folder: string): Promise<void>
  save(input: SaveInput, call: ToolCall): Promise<Saved>
}

const plain = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)

/** The JSON an MCP result carries: its structured output, or its text parts parsed. */
function resultData(result: ToolResult | unknown): unknown {
  const value = result as { output?: unknown; content?: unknown }
  if (plain(value.output)) return value.output
  const parts =
    typeof value.content === "string"
      ? value.content
      : Array.isArray(value.content)
        ? value.content.flatMap((part) => (plain(part) && part["type"] === "text" && typeof part["text"] === "string" ? [part["text"]] : [])).join("\n")
        : typeof value.output === "string"
          ? value.output
          : ""
  try {
    return JSON.parse(parts) as unknown
  } catch {
    return undefined
  }
}

const SIGN_IN_NEXT = "Run /connect, choose ElevenLabs, and sign in to that account."
const STATUS_NEXT = "Read the plugin's status, and follow its next step."

/** The tools `events_list` may run, and no others. */
export const OPERATIONS: readonly string[] = ["agents_list_conversations", "agents_list", "agents_get"]

/**
 * One plugin instance's provider. The credentials stay OpenCode's: the provider reads an alias's sign-in through the
 * host's MCP and integration APIs, and runs ElevenLabs' tools through the host's own executors, so each tool's
 * permission applies as well as the plugin's.
 */
export function createProvider(plugin: string, host: ProviderHost, media: MediaOptions): Provider {
  const nameOf = (alias: string) => accountName(plugin, alias)

  const serverOf = async (alias: string) => (await host.mcp.list()).data.find((entry) => entry.name === nameOf(alias))

  const owner = async (alias: string): Promise<Owner> => {
    const server = await serverOf(alias)
    if (server?.integrationID === undefined) {
      throw new ProviderError("NEEDS_SIGN_IN", `${nameOf(alias)} has no sign-in to name`, SIGN_IN_NEXT)
    }
    const connection = await host.integration.connection.active(server.integrationID).catch(() => undefined)
    if (connection?.type !== "credential" || String(connection.id ?? "").trim() === "") {
      throw new ProviderError("NEEDS_SIGN_IN", `${nameOf(alias)} has no active credential`, SIGN_IN_NEXT)
    }
    return ownerOf(connection)
  }

  const signal = async (alias: string): Promise<AccountSignal> => {
    const server = await serverOf(alias)
    if (server === undefined) {
      return { state: "needs_sign_in", reason: `${nameOf(alias)} is not registered; check the plugin's options.` }
    }
    switch (server.status.status) {
      case "connected":
        try {
          return { state: "ready", owner: await owner(alias) }
        } catch (error) {
          return { state: "needs_sign_in", reason: reasonOf(error) }
        }
      case "needs_auth":
        return { state: "needs_sign_in", reason: `${nameOf(alias)} needs a sign-in.` }
      case "failed":
        return { state: "error", reason: server.status.error }
      case "disabled":
        return { state: "error", reason: `${nameOf(alias)} is disabled.` }
      case "pending":
        return { state: "needs_sign_in", reason: `${nameOf(alias)} is still connecting.` }
    }
  }

  const read = (alias: string, call: ToolCall): Read => {
    const server = nameOf(alias)
    let tools: readonly Tool[] | undefined
    return async (name, input) => {
      if (!OPERATIONS.includes(name)) throw new Error(`events_list reads only ${OPERATIONS.join(", ")}, not ${name}`)
      call.signal?.throwIfAborted()
      tools ??= await host.tool.list()
      const tool = tools.find((entry) => entry.id === `${server}_${name}`)
      if (tool === undefined) {
        const state = (await serverOf(alias))?.status.status
        if (state === "needs_auth") {
          throw new ProviderError("NEEDS_SIGN_IN", `${server} needs a sign-in`, SIGN_IN_NEXT)
        }
        throw new ProviderError(
          "UNAVAILABLE",
          `ElevenLabs' ${name} is not available: ${server} ${state === "connected" ? `lists no ${name}` : state === "failed" ? "could not connect" : "is not registered"}`,
          STATUS_NEXT,
        )
      }
      let result: ToolResult
      try {
        result = await tool.execute(input as never, { ...call, progress: async () => undefined } as never)
      } catch (error) {
        if (call.signal?.aborted === true) throw error
        if (!plain(error) || error["_tag"] !== "Tool.Error" || error["error"] !== undefined) throw error
        const line = String(error["message"]).split(/\r?\n/, 1)[0] ?? ""
        if (line.startsWith(`MCP server "${server}" `)) {
          throw new ProviderError("UNAVAILABLE", `${server} is not connected`, STATUS_NEXT)
        }
        if (/\b429\b|rate[ _-]?limit|too many requests/i.test(line)) {
          throw new ProviderError("RATE_LIMITED", `ElevenLabs' ${name} was rate limited: ${line}`, "Wait a minute, then read again with the same cursor.")
        }
        throw new ProviderError("UNAVAILABLE", `ElevenLabs' ${name} failed: ${line}`, STATUS_NEXT)
      }
      return resultData(result)
    }
  }

  const assertDirectory = async (call: ToolCall, folder: string): Promise<void> => {
    try {
      await host.permission.assert({
        sessionID: call.sessionID,
        agent: call.agent,
        action: "external_directory",
        resources: [`${folder}/*`],
        source: { type: "tool", messageID: call.messageID, id: call.id },
      })
    } catch (error) {
      if (error instanceof Error && error.name === "Permission.DeclinedError") throw error
      throw new ProviderError(
        "PERMISSION_DENIED",
        `Writing under ${folder} needs OpenCode's external_directory rule, which this session does not allow`,
        `Allow { "action": "external_directory", "resource": "${folder}/*", "effect": "allow" } in this agent's permissions, then save again.`,
      )
    }
  }

  const save = (input: SaveInput, call: ToolCall): Promise<Saved> =>
    saveMedia(input, { ...media, ...(call.signal === undefined ? {} : { signal: call.signal }) })

  return { media, nameOf, owner, signal, read, assertDirectory, save }
}
