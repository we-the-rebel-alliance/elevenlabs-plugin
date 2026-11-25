import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { beforeAll, describe, expect, test } from "vitest"
import { evaluate } from "@we-the-rebel-alliance/plugin-contract/access"
import { createHost } from "@we-the-rebel-alliance/plugin-contract/kit"
import { manifest } from "../../src/manifest.ts"

const root = fileURLToPath(new URL("../..", import.meta.url))
const options = { access: "all", accounts: { work: {}, personal: {} } } as const

beforeAll(() => {
  const built = spawnSync(process.execPath, ["scripts/build.mjs"], { cwd: root, stdio: "inherit" })
  if (built.status !== 0) throw new Error(`the build failed (${built.status})`)
})

describe("the built bundle on OpenCode 2.4.1", () => {
  test("registers the four own methods on every door, in the plugin's namespace, with the declared bus events", async () => {
    const run = await createHost({ directory: root, version: "2.4.1", pluginId: "elevenlabs", options })
    try {
      expect(run.failure).toBeUndefined()
      expect(run.refusal).toBeUndefined()
      expect(run.definition?.id).toBe("elevenlabs")
      expect(run.namespace).toEqual({ name: "elevenlabs", description: manifest.plugin.summary })
      expect(run.tools.map((tool) => tool.permission).sort()).toEqual([
        "elevenlabs.events_list",
        "elevenlabs.probe",
        "elevenlabs.save_media",
        "elevenlabs.status",
      ])
      for (const tool of run.tools) {
        expect(tool.namespace).toBe("elevenlabs")
        expect(tool.codemode).toBe(true)
      }
      expect(run.rpc).toMatchObject({ id: "elevenlabs", events: expect.arrayContaining(["account", "status"]) })
      expect([...(run.rpc?.methods ?? [])].sort()).toEqual(["events_list", "probe", "save_media", "status"])
    } finally {
      await run.close()
    }
  }, 180_000)

  test("the access rules hold at every level, for own methods and per-alias pass-through tools", async () => {
    for (const level of ["all", "ask-changes", "read-only"] as const) {
      const run = await createHost({ directory: root, version: "2.4.1", pluginId: "elevenlabs", options: { ...options, access: level } })
      try {
        const build = run.agents.find((agent) => agent.id === "build")
        expect(build).toBeDefined()
        const rules = build!.permissions
        const expected = (a: "allow" | "ask" | "deny", b: "allow" | "ask" | "deny", c: "allow" | "ask" | "deny", d: "allow" | "ask" | "deny") => ({
          "elevenlabs.events_list": a,
          "elevenlabs.save_media": b,
          "elevenlabs-work_agents_update": c,
          "elevenlabs-work_agents_query_knowledge_base_rag": d,
        })
        const want = level === "all" ? expected("allow", "allow", "allow", "ask") : level === "ask-changes" ? expected("allow", "ask", "ask", "ask") : expected("allow", "deny", "deny", "ask")
        const got = Object.fromEntries(Object.keys(want).map((action) => [action, evaluate(rules, action, "*")]))
        expect(got).toEqual(want)
      } finally {
        await run.close()
      }
    }
  }, 300_000)

  test("status, probe and events_list answer over RPC; a non-read without a grant is refused", async () => {
    const run = await createHost({ directory: root, version: "2.4.1", pluginId: "elevenlabs", options })
    try {
      const status = await run.call("status", {})
      expect(status.ok).toBe(true)
      if (status.ok) {
        expect(status.output).toMatchObject({ name: "elevenlabs", host: { version: "2.4.1", range: ">=2.4.1 <2.5.0", tested: ["2.4.1"] } })
        expect((status.output as { accounts: { alias: string }[] }).accounts.map((account) => account.alias)).toEqual(["work", "personal"])
      }
      expect(await run.call("events_list", {})).toMatchObject({ ok: false, code: "ACCOUNT_REQUIRED" })
      expect(await run.call("events_list", { account: "nobodyhere" })).toMatchObject({ ok: false, code: "ACCOUNT_UNKNOWN" })
      expect(await run.call("probe", { account: "work" })).toMatchObject({ ok: false, code: "NEEDS_SIGN_IN" })
      const refused = await run.call("save_media", { url: "https://elevenlabsusercontent.com/generated.mp3" }, { rules: [{ action: "*", resource: "*", effect: "allow" }] })
      expect(refused).toMatchObject({ ok: false, code: "PERMISSION_DENIED" })
    } finally {
      await run.close()
    }
  }, 180_000)

  test("an unsupported release is refused with HOST_UNTESTED and a next step", async () => {
    const run = await createHost({ directory: root, version: "2.5.0", pluginId: "elevenlabs", options: { ...options, allowUntestedHost: false } })
    try {
      expect(run.failure).toBeUndefined()
      expect(run.refusal).toContain("HOST_UNTESTED")
      expect(run.refusal).toContain("Next step:")
    } finally {
      await run.close()
    }
  }, 120_000)
})
