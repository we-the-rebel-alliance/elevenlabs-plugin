import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { Plugin } from "@opencode/plugin"
import { OpenCode } from "@opencode/sdk"
import { beforeAll, describe, expect, test } from "vitest"
import { evaluate } from "@we-the-rebel-alliance/plugin-contract/access"
import { createHost } from "@we-the-rebel-alliance/plugin-contract/kit"
import { parse as parseYaml } from "yaml"
import { manifest } from "../../src/manifest.ts"

const root = fileURLToPath(new URL("../..", import.meta.url))
const options = { access: "all", accounts: { work: {}, personal: {} } } as const

/** Every `skills/<id>/SKILL.md` in this repository, as the package ships it. */
const skillIds = () =>
  readdirSync(join(root, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(root, "skills", entry.name, "SKILL.md")))
    .map((entry) => entry.name)
    .sort()

/** A skill's frontmatter and body, parsed as YAML; the host must register this exact text. */
function expectedSkill(id: string) {
  const path = join(root, "skills", id, "SKILL.md")
  const text = readFileSync(path, "utf8")
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text)
  if (match === null) throw new Error(`${path} has no frontmatter`)
  const parsed = parseYaml(match[1]!) as { name?: unknown; description?: unknown } | null
  if (typeof parsed?.name !== "string" || parsed.name !== id) throw new Error(`${path} names "${String(parsed?.name)}", not "${id}"`)
  if (typeof parsed.description !== "string" || parsed.description.trim() === "") throw new Error(`${path} has no description the YAML parser reads`)
  for (const marker of [">", "|", ">-", "|-", ">+", "|+"]) {
    if (parsed.description.trim() === marker) throw new Error(`${path} has only the block marker ${marker}`)
  }
  return { id, name: parsed.name, path, description: parsed.description, content: match[2]!.trim() }
}

beforeAll(() => {
  const built = spawnSync(process.execPath, ["scripts/build.mjs"], { cwd: root, stdio: "inherit" })
  if (built.status !== 0) throw new Error(`the bundle failed (${built.status})`)
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
        const expected = (a: "allow" | "ask" | "deny", b: "allow" | "ask" | "deny", c: "allow" | "ask" | "deny", d: "allow" | "ask" | "deny", e: "allow" | "ask" | "deny") => ({
          "elevenlabs.events_list": a,
          "elevenlabs.save_media": b,
          "elevenlabs-work_agents_update": c,
          "elevenlabs-work_agents_query_knowledge_base_rag": d,
          "elevenlabs-work_creative_transcribe_audio": e,
        })
        const want =
          level === "all"
            ? expected("allow", "allow", "allow", "ask", "ask")
            : level === "ask-changes"
              ? expected("allow", "ask", "ask", "ask", "ask")
              : expected("allow", "deny", "deny", "ask", "deny")
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

  test("registers every skills/*/SKILL.md with its YAML description on the real 2.4.1 host", async () => {
    const built = (await import(pathToFileURL(join(root, "dist", "index.js")).href)) as { default: Plugin.Plugin }
    const work = mkdtempSync(join(tmpdir(), "elevenlabs-skills-"))
    const config = join(work, "config")
    mkdirSync(config, { recursive: true })
    const client = await OpenCode.create({
      plugins: [built.default],
      app: { version: "2.4.1" },
      config: { content: JSON.stringify({ providers: { lmstudio: { settings: { baseURL: "" } }, ollama: { settings: { baseURL: "" } }, vllm: { settings: { baseURL: "" } } } }), directory: config, project: false, claude: false },
      database: { path: join(work, "opencode.db") },
      models: { fetch: false },
      fs: { filewatcher: false },
      log: { level: "error" },
    })
    try {
      const location = { directory: work }
      const session = await client.sessions.create({ agent: "build", location })
      await client.sessions.prompt({ sessionID: session.id, text: "activate the skills test", delivery: "queue" }).catch(() => undefined)
      let state: { status: string; error?: string } | undefined
      for (const deadline = Date.now() + 30_000; Date.now() < deadline; ) {
        const { data } = (await client.plugin.list({ location })) as { data: { id?: string; state?: { status: string; error?: string } }[] }
        state = data.find((plugin) => plugin.id === "elevenlabs")?.state
        if (state?.status === "active") break
        if (state?.status === "failed") throw new Error(state.error ?? "the plugin failed to load")
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      expect(state?.status).toBe("active")
      const ids = skillIds()
      expect(ids).toEqual(["elevenlabs", "elevenlabs-calls", "elevenlabs-creative"])
      const { data } = (await client.skill.list({ location })) as { data: { id: string; name: string; path: string; description?: string; content?: string }[] }
      const found = data
        .filter((skill) => ids.includes(skill.id))
        .map((skill) => ({ id: skill.id, name: skill.name, path: skill.path, description: skill.description, content: skill.content }))
        .sort((left, right) => left.id.localeCompare(right.id))
      expect(found).toEqual(ids.map(expectedSkill).sort((left, right) => left.id.localeCompare(right.id)))
    } finally {
      await client.close().catch(() => undefined)
      rmSync(work, { recursive: true, force: true })
    }
  }, 180_000)

  test("registers every account's MCP server on the real 2.4.1 host", async () => {
    const built = (await import(pathToFileURL(join(root, "dist", "index.js")).href)) as { default: Plugin.Plugin }
    const plugin = Plugin.define({
      id: built.default.id,
      setup: (ctx) => built.default.setup({ ...ctx, options: { access: "all", accounts: { default: {}, work: {}, personal: {} } } }),
    })
    const work = mkdtempSync(join(tmpdir(), "elevenlabs-mcp-"))
    const config = join(work, "config")
    mkdirSync(config, { recursive: true })
    const client = await OpenCode.create({
      plugins: [plugin],
      app: { version: "2.4.1" },
      config: { content: JSON.stringify({ providers: { lmstudio: { settings: { baseURL: "" } }, ollama: { settings: { baseURL: "" } }, vllm: { settings: { baseURL: "" } } } }), directory: config, project: false, claude: false },
      database: { path: join(work, "opencode.db") },
      models: { fetch: false },
      fs: { filewatcher: false },
      log: { level: "error" },
    })
    try {
      const location = { directory: work }
      const session = await client.sessions.create({ agent: "build", location })
      await client.sessions.prompt({ sessionID: session.id, text: "activate the MCP test", delivery: "queue" }).catch(() => undefined)
      let state: { status: string; error?: string } | undefined
      for (const deadline = Date.now() + 30_000; Date.now() < deadline; ) {
        const { data } = (await client.plugin.list({ location })) as { data: { id?: string; state?: { status: string; error?: string } }[] }
        state = data.find((entry) => entry.id === "elevenlabs")?.state
        if (state?.status === "active") break
        if (state?.status === "failed") throw new Error(state.error ?? "the plugin failed to load")
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      expect(state?.status).toBe("active")
      const { data } = (await client.mcp.list({ location })) as { data: { name: string }[] }
      const names = data
        .map((server) => server.name)
        .filter((name) => name === "elevenlabs" || name.startsWith("elevenlabs-"))
        .sort()
      expect(names).toEqual(["elevenlabs", "elevenlabs-personal", "elevenlabs-work"])
    } finally {
      await client.close().catch(() => undefined)
      rmSync(work, { recursive: true, force: true })
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
