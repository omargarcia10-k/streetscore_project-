import { NextResponse } from "next/server";

import { queryAnalyticsAgent } from "@/lib/analytics-agent/client";

type AnalyticsRequestBody = {
  question?: string;
};

function toUserMessage(error: unknown): { message: string; status: number } {
  const fallback = "StreetScore Analytics is temporarily unavailable. Please try again.";

  if (!(error instanceof Error)) {
    return { message: fallback, status: 503 };
  }

  const message = error.message.toLowerCase();

  if (message.includes("connection refused") || message.includes("failed to fetch")) {
    return {
      message:
        "StreetScore Analytics cannot reach the Analytics Agent service. Confirm ANALYTICS_AGENT_URL and that the service is running.",
      status: 503,
    };
  }

  if (message.includes("no usable analytics agent sql engine")) {
    return {
      message:
        "StreetScore Analytics is connected to the Analytics Agent, but no SQL engine is configured. Add a database engine in Analytics Agent settings.",
      status: 503,
    };
  }

  if (message.includes("datahub") && message.includes("not configured")) {
    return {
      message:
        "Analytics Agent is running, but DataHub is not configured there yet. Set DATAHUB_GMS_URL and DATAHUB_GMS_TOKEN for the Analytics Agent.",
      status: 503,
    };
  }

  if (message.includes("message text cannot be empty")) {
    return { message: "Please enter a question before submitting.", status: 400 };
  }

  if (message.includes("sql") || message.includes("execute")) {
    return {
      message: "The Analytics Agent could not execute the generated SQL for this question. Try refining the question.",
      status: 422,
    };
  }

  if (message.includes("llm") || message.includes("api key") || message.includes("provider")) {
    return {
      message:
        "The Analytics Agent LLM provider is not available or not configured. Verify provider settings in the Analytics Agent connection settings.",
      status: 503,
    };
  }

  return { message: error.message || fallback, status: 503 };
}

export async function POST(request: Request) {
  let body: AnalyticsRequestBody;

  try {
    body = (await request.json()) as AnalyticsRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const question = body.question?.trim() || "";

  if (!question) {
    return NextResponse.json({ error: "Question is required." }, { status: 400 });
  }

  if (question.length > 1000) {
    return NextResponse.json({ error: "Question is too long. Keep it under 1000 characters." }, { status: 400 });
  }

  const analyticsDebug = process.env.ANALYTICS_DEBUG?.trim().toLowerCase() === "true";

  try {
    const result = await queryAnalyticsAgent(question, analyticsDebug);

    return NextResponse.json({
      question,
      answer: result.answer,
      rows: result.rows,
      sql: result.sql,
      engine: result.engineName,
      conversationId: result.conversationId,
      debug: result.debug,
    });
  } catch (error) {
    const mapped = toUserMessage(error);
    console.error("Analytics API failed:", error);

    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
