export type AiTextGenerationRequest = {
  systemPrompt: string;
  userPrompt: string;
};

export type AiTextGenerationResponse = {
  text: string;
  model: string;
};

export interface AiTextProvider {
  generateText(request: AiTextGenerationRequest): Promise<AiTextGenerationResponse>;
}
