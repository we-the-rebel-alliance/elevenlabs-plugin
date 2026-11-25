// Bundle the plugin's one server entry into dist/index.js. The host provides @opencode/plugin; every other module,
// including the contract runtime, is inlined so an installed package needs no build and no dependency.
import { readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { build } from "esbuild"

const root = fileURLToPath(new URL("..", import.meta.url))
const HOST = ["@opencode/plugin"]

rmSync(join(root, "dist"), { recursive: true, force: true })
const result = await build({
  absWorkingDir: root,
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  splitting: false,
  format: "esm",
  platform: "node",
  target: "node24",
  external: HOST,
  legalComments: "none",
  metafile: true,
  logLevel: "warning",
})

/** A specifier the host or Node provides. */
const provided = (path) => path.startsWith("node:") || HOST.some((name) => path === name || path.startsWith(`${name}/`))

const problems = Object.entries(result.metafile.outputs).flatMap(([file, output]) =>
  output.imports.filter((entry) => !entry.external || !provided(entry.path)).map((entry) => `${file} imports ${entry.path}`),
)
const text = readFileSync(join(root, "dist", "index.js"), "utf8")
if (/\bfrom\s*["']\.\.?\//.test(text) || /\bimport\s*\(\s*["']\.\.?\//.test(text)) problems.push("dist/index.js imports a sibling module")
if (problems.length > 0) {
  console.error(`bundle: the bundle is not self-contained:\n  ${problems.join("\n  ")}`)
  process.exit(1)
}
console.log("bundle: dist/index.js is self-contained.")
