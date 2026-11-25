import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin } from "@opencode/plugin"
import { describe, expect, test } from "vitest"
import { readSkills, registerSkills } from "../../src/skills.ts"

const root = fileURLToPath(new URL("../..", import.meta.url))

/** A temporary `skills/` directory holding one file per entry. */
function fixture(files: Readonly<Record<string, string>>): string {
  const directory = mkdtempSync(join(tmpdir(), "plugin-skills-"))
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(join(directory, name), { recursive: true })
    writeFileSync(join(directory, name, "SKILL.md"), text)
  }
  return directory
}

describe("the skill loader", () => {
  test("reads all three plugin skills with id, name, YAML description and body", () => {
    const skills = readSkills()
    expect(skills.map((skill) => skill.id)).toEqual(["elevenlabs", "elevenlabs-calls", "elevenlabs-creative"])
    for (const skill of skills) {
      expect(skill.name).toBe(skill.id)
      expect(skill.path).toBe(join(root, "skills", skill.id, "SKILL.md"))
      expect(skill.description.trim().length).toBeGreaterThan(0)
      expect(skill.content).toContain("# ")
      expect(skill.content).not.toContain("---")
    }
  })

  test("folds, keeps or strips YAML block scalars as YAML specifies", () => {
    const cases: readonly [string, string, string][] = [
      ["folded", ">", "first line second line\n"],
      ["literal", "|", "first line\nsecond line\n"],
      ["folded-strip", ">-", "first line second line"],
      ["literal-strip", "|-", "first line\nsecond line"],
      ["folded-keep", ">+", "first line second line\n"],
      ["literal-keep", "|+", "first line\nsecond line\n"],
    ]
    for (const [name, marker, expected] of cases) {
      const directory = fixture({ [name]: `---\nname: ${name}\ndescription: ${marker}\n  first line\n  second line\n---\n\n# Body\n` })
      try {
        expect(readSkills(directory)[0]?.description).toBe(expected)
      } finally {
        rmSync(directory, { recursive: true, force: true })
      }
    }
  })

  test("rejects empty descriptions and bare block markers", () => {
    const markers: readonly [string, string][] = [
      ["gt", ">"],
      ["pipe", "|"],
      ["gt_strip", ">-"],
      ["pipe_strip", "|-"],
      ["gt_keep", ">+"],
      ["pipe_keep", "|+"],
    ]
    for (const [name, marker] of markers) {
      const id = `bare_${name}`
      const empty = fixture({ [id]: `---\nname: ${id}\ndescription: ${marker}\n---\n\n# Body\n` })
      try {
        expect(() => readSkills(empty)).toThrow(/has no frontmatter description/)
      } finally {
        rmSync(empty, { recursive: true, force: true })
      }
      const quoted = fixture({ [id]: `---\nname: ${id}\ndescription: '${marker}'\n---\n\n# Body\n` })
      try {
        expect(() => readSkills(quoted)).toThrow(/only a block marker/)
      } finally {
        rmSync(quoted, { recursive: true, force: true })
      }
    }
  })

  test("rejects an unquoted description containing a colon and space", () => {
    const directory = fixture({ broken: "---\nname: broken\ndescription: first line: second line\n---\n\n# Body\n" })
    try {
      expect(() => readSkills(directory)).toThrow(/has frontmatter that is not valid YAML/)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test("rejects a file without the registered frontmatter shape", () => {
    const cases: readonly [string, string, RegExp][] = [
      ["no frontmatter", "---missing", /SCHEMA_VIOLATION: skills\/broken\/SKILL.md has no frontmatter\. Next step: /],
      ["no name", "---\ndescription: A description.\n---\n\n# Body\n", /has no frontmatter name/],
      ["another name", "---\nname: other\ndescription: A description.\n---\n\n# Body\n", /names "other", not its directory "broken"/],
      ["no description", "---\nname: broken\n---\n\n# Body\n", /has no frontmatter description/],
      ["empty content", "---\nname: broken\ndescription: A description.\n---\n\n", /has no content below its frontmatter/],
    ]
    for (const [name, text, expected] of cases) {
      const directory = fixture({ broken: text })
      try {
        expect(() => readSkills(directory)).toThrow(expected)
      } finally {
        rmSync(directory, { recursive: true, force: true })
      }
    }
  })

  test("registerSkills adds every checked skill and returns a disposer", async () => {
    const added: { id: string; name: string; description?: string; path: string; content: string }[] = []
    let disposed = false
    const context = {
      skill: {
        async transform(callback: (editor: { add: (skill: (typeof added)[number]) => void }) => void) {
          callback({ add: (skill) => added.push(skill) })
          return {
            async dispose() {
              disposed = true
            },
          }
        },
      },
    } as unknown as Plugin.Context
    const registration = await registerSkills(context)
    expect(added.map((skill) => skill.id)).toEqual(["elevenlabs", "elevenlabs-calls", "elevenlabs-creative"])
    expect(added[0]?.path).toBe(join(root, "skills", "elevenlabs", "SKILL.md"))
    await registration.dispose()
    expect(disposed).toBe(true)
  })
})
