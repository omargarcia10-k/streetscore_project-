import type { AiTextGenerationRequest, AiTextGenerationResponse, AiTextProvider } from "./ai-text-provider";
import { LocalRepScoreAiTextProvider } from "./local-rep-score-ai-text-provider";

type ProviderConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type ConfiguredAiTextProviderResult =
  | {
      provider: AiTextProvider;
      reason?: never;
    }
  | {
      provider: null;
      reason: string;
    };

class OpenAiCompatibleTextProvider implements AiTextProvider {
  private readonly config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  async generateText(request: AiTextGenerationRequest): Promise<AiTextGenerationResponse> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: request.systemPrompt,
          },
          {
            role: "user",
            content: request.userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(`AI provider request failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
        };
      }>;
      model?: string;
    };

    const text = data.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new Error("AI provider returned an empty explanation.");
    }

    return {
      text,
      model: data.model ?? this.config.model,
    };
  }
}

export function getConfiguredAiTextProvider(): ConfiguredAiTextProviderResult {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const baseUrl = process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";

  if (apiKey) {
    return {
      provider: new OpenAiCompatibleTextProvider({
        apiKey,
        baseUrl,
        model,
      }),
    };
  }

  return {
    provider: new LocalRepScoreAiTextProvider(),
  };
}
