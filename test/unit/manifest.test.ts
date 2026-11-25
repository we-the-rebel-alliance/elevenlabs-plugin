import { describe, expect, test } from "vitest"
import { manifest } from "../../src/manifest.ts"

const entries = Object.entries(manifest.methods)

describe("the capabilities manifest", () => {
  test("declares the inventory's 249 rows: 245 pass-through tools and four own methods", () => {
    expect(entries).toHaveLength(249)
    expect(entries.filter(([method]) => method.startsWith("mcp:"))).toHaveLength(245)
    expect(entries.filter(([method]) => !method.startsWith("mcp:")).map(([method]) => method).sort()).toEqual(["events_list", "probe", "save_media", "status"])
  })

  test("classifies every pass-through tool from the inventory, with the vendor tool as its operation", () => {
    const counts: Record<string, number> = {}
    for (const [method, item] of entries) {
      if (!method.startsWith("mcp:")) continue
      expect(item.operations).toEqual([method.slice("mcp:".length)])
      counts[item.class] = (counts[item.class] ?? 0) + 1
    }
    expect(counts).toEqual({ read: 104, write: 118, send: 6, delete: 16, export: 1 })
    expect(manifest.methods["mcp:agents_delete"]?.class).toBe("delete")
    expect(manifest.methods["mcp:agents_outbound_call"]?.class).toBe("send")
    expect(manifest.methods["mcp:agents_get_signed_url"]?.class).toBe("export")
    expect(manifest.methods["mcp:agents_query_knowledge_base_rag"]).toMatchObject({ class: "read", effect: "ask" })
    expect(manifest.methods["mcp:creative_transcribe_audio"]).toMatchObject({ class: "write", effect: "ask" })
  })

  test("declares the own methods with their accounts", () => {
    expect(manifest.methods["events_list"]).toMatchObject({ class: "read", accounts: "optional" })
    expect(manifest.methods["probe"]).toMatchObject({ class: "read", accounts: "optional" })
    expect(manifest.methods["status"]).toMatchObject({ class: "read", accounts: "none" })
    expect(manifest.methods["save_media"]).toMatchObject({ class: "export", accounts: "none" })
  })

  test("declares the two conversations sources and the two bus events", () => {
    expect(manifest.sources.map((source) => [source.id, source.kind])).toEqual([
      ["elevenlabs.conversations", "events"],
      ["elevenlabs.conversations.list", "snapshot"],
    ])
    expect(manifest.events).toEqual({ account: {}, status: {} })
    expect(manifest.actions).toEqual([])
  })

  test("pins the host range and the fixed-context line", () => {
    expect(manifest.plugin.name).toBe("elevenlabs")
    expect(manifest.plugin.host).toEqual({ opencode: ">=2.4.1 <2.5.0", tested: ["2.4.1"] })
    expect(manifest.plugin.summary.length).toBeLessThanOrEqual(300)
    expect(manifest.plugin.summary).toContain("npx setup unless asked")
  })

  test("declares no pinned method and no app-specific key", () => {
    expect(entries.some(([, item]) => item.pinned === true)).toBe(false)
    expect(Object.keys(manifest).filter((key) => key.startsWith("x-"))).toEqual([])
  })
})
