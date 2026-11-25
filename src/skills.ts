import { readFile, readdir } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { Skill, type Plugin } from "@opencode/plugin"

/**
 * `skills/` at the package root, beside `dist/` in an installed package and beside `src/` in this repository. The path
 * is resolved from this module, so the same code reads the package's own skills in both places.
 */
export const SKILLS_DIR = fileURLToPath(new URL("../skills/", import.meta.url))

/** One skill's frontmatter and body, checked before the synchronous transform needs it. */
export function parseSkill(directory: string, path: string, text: string): Skill.Info {
  const normalised = text.replace(/\r\n/g, "\n")
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(normalised)
  const fail = (problem: string): never => {
    throw new Error(`The "${directory}" skill was not loaded: skills/${directory}/SKILL.md ${problem}. Reinstall the plugin.`)
  }
  if (!match) return fail("has no frontmatter")
  const fields = new Map<string, string>()
  for (const line of match[1]!.split("\n")) {
    const at = line.indexOf(":")
    if (at <= 0) continue
    fields.set(line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^(["'])(.*)\1$/, "$2"))
  }
  if (fields.get("name") !== directory) return fail(`must be named "${directory}" in its frontmatter`)
  const description = fields.get("description")?.trim()
  if (description === undefined || description === "") return fail("has no description")
  // The one-line rule: a block scalar (`>`, `|`, `>-`, `|+`, or their indented forms) is not read by this parser.
  if (/^[>|](?:[+-])?(?:\s|$)/.test(description)) {
    return fail("has a block scalar for its description; write description: <one line>")
  }
  const content = match[2]!.trim()
  if (content === "") return fail("has no content")
  return {
    id: Skill.ID.make(directory),
    name: Skill.Name.make(directory),
    description,
    path: Skill.Info.fields.path.make(path),
    content,
  }
}

/** Every `skills/*\/SKILL.md`, read and checked. A directory without that file is not a skill and is skipped. */
export async function loadSkills(directory = SKILLS_DIR): Promise<readonly Skill.Info[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch((error: unknown) => {
    throw new Error(`The plugin's skills directory ${directory} could not be read (${error instanceof Error ? error.message : String(error)}). Reinstall the plugin.`)
  })
  const skills: Skill.Info[] = []
  for (const entry of entries.filter((item) => item.isDirectory()).sort((left, right) => left.name.localeCompare(right.name))) {
    const path = join(directory, entry.name, "SKILL.md")
    let text: string
    try {
      text = await readFile(path, "utf8")
    } catch (error) {
      if ((error as { code?: unknown }).code === "ENOENT") continue
      throw new Error(`The "${entry.name}" skill could not be read from ${path}. Reinstall the plugin.`)
    }
    skills.push(parseSkill(entry.name, path, text))
  }
  if (skills.length === 0) throw new Error(`No skills were found under ${directory}. Reinstall the plugin.`)
  return skills
}

/** Registers every skill through OpenCode's own editor; the returned registration is disposed at cleanup. */
export function registerSkills(skill: Pick<Plugin.Context["skill"], "transform">) {
  return loadSkills().then((skills) =>
    skill.transform((editor) => {
      for (const info of skills) editor.add(info)
    }),
  )
}
