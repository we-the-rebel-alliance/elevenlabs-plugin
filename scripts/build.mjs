// Bundle the plugin's one server entry into dist/index.js. The host provides @opencode/plugin; every other module,
// including the contract runtime, is inlined so an installed package needs no build and no dependency.
import { readFileSync, rmSync } from "node:fs"
import { builtinModules } from "node:module"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { build } from "esbuild"

const root = fileURLToPath(new URL("..", import.meta.url))
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
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
  // The YAML parser is CommonJS and reads `process` with require(); the bundle is ESM, so give it a real require.
  banner: { js: `import { createRequire } from "node:module";\nconst require = createRequire(import.meta.url);\n// ${pkg.name} ${pkg.version}. Built by scripts/build.mjs; do not edit.` },
})

/** A specifier the host or Node provides. */
const BUILTINS = new Set(builtinModules)
const provided = (path) => path.startsWith("node:") || BUILTINS.has(path) || HOST.some((name) => path === name || path.startsWith(`${name}/`))

const problems = Object.entries(result.metafile.outputs).flatMap(([file, output]) =>
  output.imports.filter((entry) => !entry.external || !provided(entry.path)).map((entry) => `${file} imports ${entry.path}`),
)
const text = readFileSync(join(root, "dist", "index.js"), "utf8")
if (/\bfrom\s*["']\.\.?\//.test(text) || /\bimport\s*\(\s*["']\.\.?\//.test(text)) problems.push("dist/index.js imports a sibling module")
if (!text.includes("YAMLParseError")) problems.push("dist/index.js does not contain the bundled YAML parser")
if (problems.length > 0) {
  console.error(`bundle: the bundle is not self-contained:\n  ${problems.join("\n  ")}`)
  process.exit(1)
}
console.log("bundle: dist/index.js is self-contained.")
