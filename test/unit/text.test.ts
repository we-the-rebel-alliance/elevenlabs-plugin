import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vitest"
import { manifest } from "../../src/manifest.ts"

const root = fileURLToPath(new URL("../..", import.meta.url))

/** The front matter's description, as T0 reads it. */
function descriptionOf(file: string): string {
  const text = readFileSync(join(root, file), "utf8")
  const match = /^description:\s*(.*)$/m.exec(text)
  if (match?.[1] === undefined) throw new Error(`${file} has no description`)
  return match[1]
}

describe("the fixed-context text", () => {
  test("the namespace line is within plugin-contract v0.0.0's 300-character cap", () => {
    expect(manifest.plugin.summary.length).toBeLessThanOrEqual(300)
    expect(manifest.plugin.summary.length).toBeGreaterThan(0)
    expect(manifest.plugin.summary).not.toMatch(/[\r\n]/)
  })

  test("each skill description is within 300 characters and in the plugin's namespace", () => {
    for (const name of ["elevenlabs", "elevenlabs-calls", "elevenlabs-creative"]) {
      const text = readFileSync(join(root, "skills", name, "SKILL.md"), "utf8")
      expect(text).toMatch(new RegExp(`^name: ${name}$`, "m"))
      expect(descriptionOf(`skills/${name}/SKILL.md`).length).toBeLessThanOrEqual(300)
    }
  })


})
