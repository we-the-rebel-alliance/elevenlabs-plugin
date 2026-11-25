import { describe, expect, test } from "vitest"
import { accountsOf, resolveAccount } from "@we-the-rebel-alliance/plugin-contract/accounts"
import { watchAccounts } from "../../src/accounts.ts"
import { manifest } from "../../src/manifest.ts"
import { endpointFor, REGIONS } from "../../src/provider/elevenlabs.ts"
import { createFakeProvider, fakeBus } from "../support/fake-provider.ts"

const options = { access: "all", accounts: { work: { region: "eu" }, personal: { region: "global" } } }
const plan = accountsOf(manifest, options)

describe("the account plan", () => {
  test("reads two aliases, each with its own region", () => {
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.value.accounts).toEqual([
      { alias: "work", profile: { region: "eu" } },
      { alias: "personal", profile: { region: "global" } },
    ])
    expect(plan.value.accounts.map((account) => endpointFor(account.profile))).toEqual([REGIONS.eu, REGIONS.global])
  })

  test("resolves a named alias, refuses a missing and an unknown one", () => {
    if (!plan.ok) throw new Error("the plan should be valid")
    expect(resolveAccount(plan.value.accounts, { account: "work" })).toMatchObject({ ok: true, alias: "work" })
    expect(resolveAccount(plan.value.accounts, {})).toMatchObject({ ok: false, code: "ACCOUNT_REQUIRED" })
    expect(resolveAccount(plan.value.accounts, { account: "nobodyhere" })).toMatchObject({ ok: false, code: "ACCOUNT_UNKNOWN" })
  })

  test("registers one vendor MCP server per alias with the region's endpoint and the scope pin", async () => {
    const servers = new Map<string, unknown>()
    const ctx = {
      mcp: {
        transform: async (callback: (editor: unknown) => void) => {
          callback({ set: (name: string, config: unknown) => void servers.set(name, config) })
        },
      },
      integration: { transform: async () => undefined },
    }
    const { registerFor } = await import("../../src/accounts.ts")
    const result = await registerFor(ctx as never, manifest, options)
    expect(result.problems).toEqual([])
    expect([...servers.keys()].sort()).toEqual(["elevenlabs-personal", "elevenlabs-work"])
    expect(servers.get("elevenlabs-work")).toMatchObject({ type: "remote", url: REGIONS.eu, oauth: { scope: expect.stringContaining("convai_read") } })
    expect(servers.get("elevenlabs-personal")).toMatchObject({ type: "remote", url: REGIONS.global })
  })

  test("refuses a profile region the manifest does not declare", () => {
    expect(accountsOf(manifest, { accounts: { work: { region: "mars" } } })).toMatchObject({ ok: false })
  })
})

describe("the sign-in watcher", () => {
  test("emits account for a changed alias and status for the changed whole", async () => {
    const provider = createFakeProvider()
    const { bus, events } = fakeBus()
    const host = {
      event: {
        subscribe: (input: { readonly signal?: AbortSignal }) =>
          (async function* () {
            const signal = input.signal
            if (signal === undefined) return
            await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true }))
          })(),
      },
      mcp: { list: async () => ({ data: [] }) },
    }
    const watcher = watchAccounts(host as never, { manifest, options, provider, problems: [], bus })
    try {
      await watcher.check() // seeds both aliases ready
      expect(events).toEqual([])
      provider.setState("personal", "needs_sign_in")
      await watcher.check()
      expect(events.map((event) => [event.name, event.data])).toEqual([
        ["account", { account: "personal", state: "needs_sign_in" }],
        ["status", { state: "needs_sign_in" }],
      ])
    } finally {
      await watcher.stop()
    }
  })

  test("an account error makes the status nudge say error", async () => {
    const provider = createFakeProvider()
    const { bus, events } = fakeBus()
    const host = { event: { subscribe: () => (async function* () {})() }, mcp: { list: async () => ({ data: [] }) } }
    const watcher = watchAccounts(host as never, { manifest, options, provider, problems: [], bus })
    try {
      await watcher.check()
      provider.setState("work", "error")
      await watcher.check()
      expect(events.at(-1)).toEqual({ name: "status", data: { state: "error" } })
    } finally {
      await watcher.stop()
    }
  })
})

describe("the provider", () => {
  test("names the one endpoint per region and pins seven scopes", async () => {
    expect(Object.keys(REGIONS)).toEqual(["global", "us", "eu", "in", "sg"])
    for (const [region, endpoint] of Object.entries(REGIONS)) expect(endpoint).toMatch(new RegExp(`^https://[^/]+/v1/mcp$`))
    const { serverConfig } = await import("../../src/provider/elevenlabs.ts")
    expect(serverConfig({ region: "in" })).toMatchObject({
      type: "remote",
      url: REGIONS.in,
      oauth: { scope: "convai_read convai_write text_to_speech speech_history_read flows image_video_generation voice_generation" },
    })
  })

  test("a failed tool call maps to the contract's codes", async () => {
    const { createProvider } = await import("../../src/provider/elevenlabs.ts")
    const failing = {
      mcp: { list: async () => ({ data: [{ name: "elevenlabs", integrationID: "int", status: { status: "connected" } }] }) },
      integration: { connection: { active: async () => ({ type: "credential", id: "c1", label: "Work" }) } },
      tool: {
        list: async () => [
          {
            id: "elevenlabs_agents_list",
            execute: async () => {
              throw Object.assign(new Error('MCP server "elevenlabs" is not connected'), { _tag: "Tool.Error" })
            },
          },
        ],
      },
      permission: { assert: async () => undefined },
    }
    const provider = createProvider("elevenlabs", failing as never, { root: "/tmp", maxBytes: 1024, hosts: ["elevenlabsusercontent.com"] })
    await expect(provider.read("default", { sessionID: "s", agent: "build", messageID: "m", id: "c" })("agents_list", {})).rejects.toMatchObject({ code: "UNAVAILABLE" })
  })

  test("a provider rate limit is RATE_LIMITED", async () => {
    const { createProvider } = await import("../../src/provider/elevenlabs.ts")
    const limited = {
      mcp: { list: async () => ({ data: [{ name: "elevenlabs", integrationID: "int", status: { status: "connected" } }] }) },
      integration: { connection: { active: async () => ({ type: "credential", id: "c1", label: "Work" }) } },
      tool: {
        list: async () => [
          {
            id: "elevenlabs_agents_list",
            execute: async () => {
              throw Object.assign(new Error("429 too many requests"), { _tag: "Tool.Error" })
            },
          },
        ],
      },
      permission: { assert: async () => undefined },
    }
    const provider = createProvider("elevenlabs", limited as never, { root: "/tmp", maxBytes: 1024, hosts: ["elevenlabsusercontent.com"] })
    await expect(provider.read("default", { sessionID: "s", agent: "build", messageID: "m", id: "c" })("agents_list", {})).rejects.toMatchObject({ code: "RATE_LIMITED" })
  })

  test("ownerOf is scheme-qualified and never verified", async () => {
    const { ownerOf } = await import("../../src/provider/elevenlabs.ts")
    expect(ownerOf({ id: "credential id", label: " Work\tsign-in " })).toEqual({
      id: "elevenlabs:credential:credential%20id",
      label: "Work sign-in",
      verified: false,
    })
  })
})
