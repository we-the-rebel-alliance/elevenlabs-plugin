import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { createHost } from "@we-the-rebel-alliance/plugin-contract/kit"

const root = fileURLToPath(new URL("../..", import.meta.url))
const work = mkdtempSync(join(tmpdir(), "elevenlabs-pack-"))
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { name: string; version: string }

function run(command: string, args: string[], cwd: string): string {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", env: { ...process.env, npm_config_update_notifier: "false" } })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed (${result.status}):\n${result.stderr}\n${result.stdout}`)
  return result.stdout
}

let tarball = ""
let installed = ""

beforeAll(() => {
  run(process.execPath, ["scripts/build.mjs"], root)
  const packed = JSON.parse(run("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", work], root)) as { filename: string; files: { path: string }[] }[]
  const first = packed[0]
  if (first === undefined) throw new Error("npm pack wrote no tarball")
  tarball = join(work, first.filename)
  const project = join(work, "consumer")
  mkdirSync(project, { recursive: true })
  writeFileSync(join(project, "package.json"), JSON.stringify({ name: "elevenlabs-pack-consumer", private: true, type: "module" }))
  run("npm", ["install", tarball, "@opencode/plugin@2.4.1", "@opencode/sdk@2.4.1", "--ignore-scripts", "--no-audit", "--no-fund", "--prefer-offline"], project)
  installed = join(project, "node_modules", ...pkg.name.split("/"))
}, 600_000)

afterAll(() => rmSync(work, { recursive: true, force: true }), 120_000)

describe("the packed release", () => {
  test("holds the whitelist and the built server entry, and no source or test file", () => {
    const listed = run("tar", ["-tzf", tarball], work)
      .trim()
      .split("\n")
      .filter((path) => path !== "" && !path.endsWith("/"))
      .map((path) => path.replace(/^package\//, ""))
      .sort()
    const expected = [
      "package.json",
      "dist/index.js",
      "README.md",
      "LICENSE",
      "assets/icon.svg",
      "assets/icon-128.png",
      "assets/icon-256.png",
      "skills/elevenlabs/SKILL.md",
      "skills/elevenlabs-calls/SKILL.md",
      "skills/elevenlabs-creative/SKILL.md",
    ].sort()
    expect(listed).toEqual(expected)
    expect(listed.filter((path) => path.startsWith("test/") || path.startsWith("src/") || path.startsWith("scripts/"))).toEqual([])
  })

  test("installs with scripts disabled and starts in the real host", async () => {
    const found = JSON.parse(readFileSync(join(installed, "package.json"), "utf8")) as { version: string; capabilities: { plugin: { name: string } } }
    expect(found.version).toBe(pkg.version)
    expect(found.capabilities.plugin.name).toBe("elevenlabs")
    const runHost = await createHost({ directory: installed, version: "2.4.1", pluginId: "elevenlabs", options: { access: "all", accounts: { work: {}, personal: {} } } })
    try {
      expect(runHost.failure).toBeUndefined()
      expect(runHost.refusal).toBeUndefined()
      expect(runHost.definition?.id).toBe("elevenlabs")
      expect(runHost.tools.map((tool) => tool.permission).sort()).toEqual(["elevenlabs.events_list", "elevenlabs.probe", "elevenlabs.save_media", "elevenlabs.status"])
      const status = await runHost.call("status", {})
      expect(status.ok).toBe(true)
    } finally {
      await runHost.close()
    }
  }, 300_000)
})
