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
  test("the namespace line is the audited 385-character line, within the 400 budget", () => {
    expect(manifest.plugin.summary).toHaveLength(385)
    expect(manifest.plugin.summary.length).toBeLessThanOrEqual(400)
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
