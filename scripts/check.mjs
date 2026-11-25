// The repository check: typecheck, bundle, unit, host, pack, then plugin-kit check. CI runs this same list in one job.
// `node scripts/check.mjs <stage>` runs one stage, so a failure can be worked on alone.
import { spawnSync } from "node:child_process"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))
const bin = (name) => join(root, "node_modules", ".bin", process.platform === "win32" ? `${name}.cmd` : name)

const STAGES = [
  { name: "typecheck", command: bin("tsc"), args: ["--noEmit"] },
  { name: "bundle", command: process.execPath, args: ["scripts/build.mjs"] },
  { name: "unit", command: bin("vitest"), args: ["run", "test/unit"] },
  { name: "host", command: bin("vitest"), args: ["run", "test/host"] },
  { name: "pack", command: bin("vitest"), args: ["run", "test/pack"] },
  { name: "kit", command: bin("plugin-kit"), args: ["check"] },
]

const requested = process.argv[2]
if (requested !== undefined && !STAGES.some((stage) => stage.name === requested)) {
  console.error(`check: unknown stage "${requested}"; use one of ${STAGES.map((stage) => stage.name).join(", ")}`)
  process.exit(2)
}

for (const stage of STAGES) {
  if (requested !== undefined && stage.name !== requested) continue
  console.log(`\ncheck: ${stage.name}`)
  const result = spawnSync(stage.command, stage.args, { cwd: root, stdio: "inherit" })
  if (result.error) {
    console.error(`check: ${stage.name} could not run: ${result.error.message}`)
    process.exit(1)
  }
  if (result.status !== 0) {
    console.error(`check: ${stage.name} failed (${result.status})`)
    process.exit(result.status ?? 1)
  }
}
console.log("\ncheck: ok")
