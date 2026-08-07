type AnalyticsAgentEngine = {
  name: string;
  type?: string;
  label?: string;
};

type AnalyticsAgentCoverage = {
  covered: boolean;
  dataset_count: number;
  platform?: string | null;
};

type AnalyticsDebugInfo = {
  question: string;
  baseUrl: string;
  selectedEngine: string;
  conversationId: string;
  datahubCoverage: AnalyticsAgentCoverage | null;
  discoveredToolNames: string[];
  sql: string[];
  errorEvents: string[];
};

type AnalyticsQueryResult = {
  answer: string;
  engineName: string;
  conversationId: string;
  rows: unknown[];
  sql: string | null;
  debug?: AnalyticsDebugInfo;
};

type AnalyticsAgentSseEvent = {
  event?: string;
  payload?: Record<string, unknown>;
};

const DEFAULT_ANALYTICS_AGENT_URL = "http://localhost:8100";

function normalizeBaseUrl(value: string | undefined): string {
  const raw = (value ?? DEFAULT_ANALYTICS_AGENT_URL).trim();

  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Analytics Agent request failed (${response.status}): ${body || "No response body"}`);
  }

  return (await response.json()) as T;
}

async function getAvailableEngines(baseUrl: string): Promise<AnalyticsAgentEngine[]> {
  const response = await fetch(`${baseUrl}/api/engines`, {
    cache: "no-store",
  });

  return parseJsonResponse<AnalyticsAgentEngine[]>(response);
}

function resolveEngineName(engines: AnalyticsAgentEngine[]): string {
  const configured = process.env.ANALYTICS_AGENT_ENGINE?.trim();

  if (configured) {
    return configured;
  }

  const firstUsable = engines.find((engine) => engine.name !== "chart");

  if (!firstUsable?.name) {
    throw new Error("No usable Analytics Agent SQL engine is configured. Add one in Analytics Agent settings.");
  }

  return firstUsable.name;
}

async function createConversation(baseUrl: string, engineName: string): Promise<string> {
  const response = await fetch(`${baseUrl}/api/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "StreetScore Ask",
      engine_name: engineName,
    }),
    cache: "no-store",
  });

  const payload = await parseJsonResponse<{ id: string }>(response);

  if (!payload.id) {
    throw new Error("Analytics Agent did not return a conversation id.");
  }

  return payload.id;
}

function parseSseEvents(raw: string): AnalyticsAgentSseEvent[] {
  const blocks = raw.split("\n\n");
  const events: AnalyticsAgentSseEvent[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();

    if (!trimmed) {
      continue;
    }

    const dataLines = trimmed
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim());

    if (dataLines.length === 0) {
      continue;
    }

    const dataText = dataLines.join("\n");

    try {
      events.push(JSON.parse(dataText) as AnalyticsAgentSseEvent);
    } catch {
      // Ignore malformed SSE chunks from keep-alives or partial payloads.
    }
  }

  return events;
}

async function sendMessageAndCollectEvents(
  baseUrl: string,
  conversationId: string,
  question: string,
): Promise<AnalyticsAgentSseEvent[]> {
  const response = await fetch(`${baseUrl}/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: question }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Analytics Agent stream failed (${response.status}): ${body || "No response body"}`);
  }

  if (!response.body) {
    throw new Error("Analytics Agent did not return a stream body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let done = false;
  let buffer = "";
  const events: AnalyticsAgentSseEvent[] = [];

  while (!done) {
    const chunk = await reader.read();
    done = chunk.done;

    if (chunk.value) {
      buffer += decoder.decode(chunk.value, { stream: !done });

      const marker = buffer.lastIndexOf("\n\n");

      if (marker >= 0) {
        const complete = buffer.slice(0, marker + 2);
        buffer = buffer.slice(marker + 2);
        events.push(...parseSseEvents(complete));
      }
    }
  }

  if (buffer.trim()) {
    events.push(...parseSseEvents(buffer));
  }

  return events;
}

function eventPayloadText(payload: Record<string, unknown> | undefined): string {
  const text = payload?.text;
  return typeof text === "string" ? text.trim() : "";
}

function collectSqlText(payload: Record<string, unknown> | undefined): string | null {
  if (!payload) {
    return null;
  }

  const candidates = [payload.sql, payload.query, payload.statement];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function collectRows(payload: Record<string, unknown> | undefined): unknown[] {
  if (!payload) {
    return [];
  }

  const rows = payload.rows;

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows;
}

async function getDataHubCoverage(baseUrl: string, engineName: string): Promise<AnalyticsAgentCoverage | null> {
  try {
    const response = await fetch(`${baseUrl}/api/settings/connections/${encodeURIComponent(engineName)}/datahub-coverage`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as AnalyticsAgentCoverage;
  } catch {
    return null;
  }
}

export async function queryAnalyticsAgent(question: string, debugEnabled = false): Promise<AnalyticsQueryResult> {
  const baseUrl = normalizeBaseUrl(process.env.ANALYTICS_AGENT_URL);
  const engines = await getAvailableEngines(baseUrl);
  const engineName = resolveEngineName(engines);
  const conversationId = await createConversation(baseUrl, engineName);
  const events = await sendMessageAndCollectEvents(baseUrl, conversationId, question);

  const completedText = events
    .filter((event) => event.event === "COMPLETE")
    .map((event) => eventPayloadText(event.payload))
    .find((text) => Boolean(text));

  const textEvents = events
    .filter((event) => event.event === "TEXT")
    .map((event) => eventPayloadText(event.payload))
    .filter(Boolean);

  const sqlEvents = events.filter((event) => event.event === "SQL");
  const sqlStatements = sqlEvents
    .map((event) => collectSqlText(event.payload))
    .filter((value): value is string => Boolean(value));

  const firstRows = sqlEvents
    .map((event) => collectRows(event.payload))
    .find((rows) => rows.length > 0) ?? [];

  const errorEvents = events
    .filter((event) => event.event === "ERROR")
    .map((event) => eventPayloadText(event.payload))
    .filter(Boolean);

  if (errorEvents.length > 0 && !completedText && textEvents.length === 0) {
    throw new Error(errorEvents[0]);
  }

  const answer = completedText || textEvents.at(-1) || "No answer was returned by the Analytics Agent.";
  const discoveredToolNames = events
    .filter((event) => event.event === "TOOL_CALL" || event.event === "TOOL_RESULT")
    .map((event) => {
      const toolName = event.payload?.tool_name;
      return typeof toolName === "string" ? toolName : "";
    })
    .filter(Boolean);

  const uniqueToolNames = [...new Set(discoveredToolNames)];

  const result: AnalyticsQueryResult = {
    answer,
    engineName,
    conversationId,
    rows: firstRows,
    sql: sqlStatements[0] ?? null,
  };

  if (debugEnabled) {
    result.debug = {
      question,
      baseUrl,
      selectedEngine: engineName,
      conversationId,
      datahubCoverage: await getDataHubCoverage(baseUrl, engineName),
      discoveredToolNames: uniqueToolNames,
      sql: sqlStatements,
      errorEvents,
    };
  }

  return result;
}
