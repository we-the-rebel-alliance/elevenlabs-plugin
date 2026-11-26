// The release tarball ships NOTICE next to a bundle that inlines third-party code. Build the server entry with the
// same externals as scripts/build.mjs, collect every package that actually ends up in the bundle (including packages
// inlined by plugin-contract's dist, such as zod), and require each one's heading and licence text in NOTICE.
import { build } from "esbuild"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vitest"

const root = fileURLToPath(new URL("../..", import.meta.url))
const PLUGIN = "@we-the-rebel-alliance/elevenlabs-plugin"
const HOST = ["@opencode/plugin"]

/** A package name from an esbuild input path, or undefined for the plugin's own sources. */
function packageOf(path: string): string | undefined {
  return /^node_modules\/((?:@[^/]+\/)?[^/]+)\//.exec(path)?.[1]
}

function keep(name: string | undefined): name is string {
  return name !== undefined && name !== PLUGIN && !name.startsWith("@opencode/")
}

function section(name: string): RegExp {
  return new RegExp(`^## ${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|$)`, "m")
}

/** The licence file a package ships, if it has one. */
function licenceFile(directory: string): string | undefined {
  return readdirSync(directory).find((entry) => /^(licen[cs]e|copying)(\.|$)/i.test(entry))
}

/** Every package esbuild actually inlines into the server bundle. */
async function bundledPackages(): Promise<string[]> {
  const result = await build({
    absWorkingDir: root,
    entryPoints: ["src/index.ts"],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    target: "node24",
    external: HOST,
    legalComments: "none",
    metafile: true,
    logLevel: "silent",
  })
  const found = new Set<string>()
  const inputs = Object.keys(result.metafile.inputs)
  for (const input of inputs) {
    const name = packageOf(input)
    if (keep(name)) found.add(name)
  }
  // The contract is always inlined by the plugin, even when esbuild attributes its files to a path outside
  // node_modules. The contract's dist also carries zod pre-bundled; detect it from the emitted code, not a metafile
  // name, because zod's input is inside the contract's dist.
  found.add("@we-the-rebel-alliance/plugin-contract")
  const output = (result.outputFiles ?? []).map((file) => file.text).join("\n")
  if (output.includes("$ZodType") || output.includes("ZodError")) found.add("zod")
  // Other bundled dists may name their inlined dependencies in a comment (`// node_modules/<name>/...`).
  for (const input of inputs) {
    if (!input.startsWith("node_modules/")) continue
    const text = readFileSync(join(root, input), "utf8")
    for (const match of text.matchAll(/\/\/\s*node_modules\/((?:@[^/\s]+\/)?[^/\s]+)\//g)) {
      if (keep(match[1])) found.add(match[1])
    }
  }
  return [...found].sort()
}

describe("the bundled third-party notices", () => {
  test("every bundled package has its heading and verbatim licence text in NOTICE", async () => {
    const packages = await bundledPackages()
    expect(packages).toContain("@we-the-rebel-alliance/plugin-contract")
    expect(packages).toContain("yaml")
    expect(packages).toContain("zod")
    const notice = readFileSync(join(root, "NOTICE"), "utf8")
    for (const name of packages) {
      const directory = join(root, "node_modules", name)
      const pkg = JSON.parse(readFileSync(join(directory, "package.json"), "utf8")) as { version: string; license: string }
      expect(notice, name).toContain(`## ${name} ${pkg.version} (${pkg.license})`)
      const file = licenceFile(directory)
      expect(file, name).toBeDefined()
      if (file === undefined) continue
      expect(notice, name).toContain(readFileSync(join(directory, file), "utf8").trim())
    }
  })

  test("a missing package section is reported", async () => {
    const packages = await bundledPackages()
    const notice = readFileSync(join(root, "NOTICE"), "utf8")
    const withoutZod = notice.replace(/^## zod [\s\S]*?(?=^## |\s*$)/m, "")
    expect(packages.filter((name) => !section(name).test(withoutZod))).toContain("zod")
  })
})
