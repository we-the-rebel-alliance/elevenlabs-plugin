import type { JsonSchema } from "@we-the-rebel-alliance/plugin-contract/manifest"
import type { MethodHandler } from "@we-the-rebel-alliance/plugin-contract/register"
import { expandRoot } from "../provider/media/policy.ts"
import type { Provider } from "../provider/elevenlabs.ts"

export const SAVE_SCHEMA = {
  type: "object",
  properties: {
    url: {
      type: "string",
      minLength: 1,
      description: "The signed link a generation returned, on elevenlabsusercontent.com. It expires about two hours after the generation.",
    },
    name: { type: "string", description: "The file name to write. The extension is taken from the file's type when the name has none." },
    overwrite: { type: "boolean", description: "Replace a file of that name that is already there. Off by default." },
  },
  required: ["url"],
  additionalProperties: false,
} as const satisfies JsonSchema

export const SAVE_OUTPUT = {
  type: "object",
  required: ["path", "bytes", "sha256", "mime"],
  properties: {
    path: { type: "string" },
    bytes: { type: "integer", minimum: 0 },
    sha256: { type: "string" },
    mime: { type: "string" },
    durationSeconds: { type: "number" },
  },
  additionalProperties: false,
} as const satisfies JsonSchema

/** The model-facing description: what the tool does, where files go, and that no bytes enter the conversation. */
function saveDescription(root: string): string {
  return `Save a generated ElevenLabs file to disk from the signed link a generation returned, and report its path, size, sha256 and, when the file states one, its duration. Files are written under ${root}. The link expires in about two hours; this is how a result is kept. The file never enters the conversation: no bytes are returned, only the path. The first save writes outside the project, so OpenCode asks once for the "external_directory" rule as well as the plugin's own permission.`
}

/** `save_media`: a generated file is downloaded under the media root; no bytes pass through the model. */
export function saveMediaHandler(provider: Provider): MethodHandler {
  const root = provider.media.root
  return {
    description: saveDescription(root),
    input: SAVE_SCHEMA,
    output: SAVE_OUTPUT,
    async run(input, call) {
      const url = typeof input["url"] === "string" ? input["url"] : ""
      const name = typeof input["name"] === "string" && input["name"].trim() !== "" ? input["name"] : undefined
      await provider.assertDirectory(call, expandRoot(root))
      return provider.save({ url, ...(name === undefined ? {} : { name }), ...(input["overwrite"] === true ? { overwrite: true } : {}) }, call)
    },
  }
}
