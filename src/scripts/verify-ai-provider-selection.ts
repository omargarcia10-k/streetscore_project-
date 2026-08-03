import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function main() {
  const sourcePath = new URL("../lib/ai/configured-ai-text-provider.ts", import.meta.url);
  const source = await readFile(sourcePath, "utf8");

  assert.match(
    source,
    /const\s+apiKey\s*=\s*process\.env\.OPENAI_API_KEY\?\.trim\(\);/,
    "Configured provider must read OPENAI_API_KEY",
  );

  assert.match(
    source,
    /if\s*\(apiKey\)\s*\{[\s\S]*provider:\s*new\s+OpenAiCompatibleTextProvider\(/,
    "Configured provider must select OpenAI provider when OPENAI_API_KEY exists",
  );

  assert.match(
    source,
    /return\s*\{[\s\S]*provider:\s*new\s+LocalRepScoreAiTextProvider\(\),/,
    "Configured provider must fallback to local provider when OPENAI_API_KEY is absent",
  );

  const openAiBranchStart = source.indexOf("if (apiKey)");
  const localReturnStart = source.indexOf("provider: new LocalRepScoreAiTextProvider()");

  assert.ok(openAiBranchStart >= 0, "Expected OPENAI key branch in configured provider");
  assert.ok(localReturnStart >= 0, "Expected local provider fallback in configured provider");
  assert.ok(openAiBranchStart < localReturnStart, "OPENAI branch should be evaluated before local fallback return");

  console.log("AI provider selection verification passed.");
}

void main();
