"use client";

import { useMemo, useState } from "react";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type AnalyticsResponse = {
  question: string;
  answer: string;
  rows: unknown[];
  sql: string | null;
  engine: string;
  conversationId: string;
  debug?: {
    question: string;
    baseUrl: string;
    selectedEngine: string;
    conversationId: string;
    datahubCoverage: {
      covered: boolean;
      dataset_count: number;
      platform?: string | null;
    } | null;
    discoveredToolNames: string[];
    sql: string[];
    errorEvents: string[];
  };
};

const EXAMPLES = [
  "Which business has the highest REP Score in Park Slope?",
  "Show me the top 5 businesses in Park Slope by REP Score.",
  "What factors contribute to a business's REP Score?",
];

function stringifyValue(value: unknown): string {
  if (value == null) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

export default function AskStreetScoreCard() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalyticsResponse | null>(null);

  const selectedQuestion = useMemo(() => question.trim(), [question]);

  async function submitQuestion(nextQuestion?: string) {
    const effectiveQuestion = (nextQuestion ?? selectedQuestion).trim();

    if (!effectiveQuestion || loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/analytics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: effectiveQuestion }),
      });

      const payload = (await response.json()) as AnalyticsResponse | { error?: string };

      if (!response.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "Failed to run analytics question.");
      }

      setResult(payload as AnalyticsResponse);
      setQuestion(effectiveQuestion);
    } catch (submitError) {
      setResult(null);
      setError(submitError instanceof Error ? submitError.message : "Failed to run analytics question.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="size-5" />
          Ask StreetScore
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <Textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask a question about StreetScore data"
          rows={3}
        />

        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <Button
              key={example}
              type="button"
              variant="outline"
              className="h-auto whitespace-normal text-left"
              onClick={() => {
                setQuestion(example);
                void submitQuestion(example);
              }}
            >
              {example}
            </Button>
          ))}
        </div>

        <Button type="button" onClick={() => void submitQuestion()} disabled={!selectedQuestion || loading}>
          {loading ? "Thinking..." : "Ask"}
        </Button>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        {result ? (
          <div className="space-y-3">
            <div>
              <p className="text-muted-foreground text-xs">Answer</p>
              <p className="whitespace-pre-wrap">{result.answer}</p>
            </div>

            {result.rows.length > 0 ? (
              <div>
                <p className="text-muted-foreground text-xs">Structured rows</p>
                <div className="overflow-x-auto rounded-md border p-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        {Object.keys((result.rows[0] as Record<string, unknown>) || {}).map((column) => (
                          <th key={column} className="px-2 py-1 text-left font-medium">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.slice(0, 10).map((row) => {
                        const record = (row as Record<string, unknown>) || {};
                        const rowKey = JSON.stringify(record);

                        return (
                          <tr key={rowKey} className="border-t">
                            {Object.entries(record).map(([column, value]) => (
                              <td key={`${rowKey}-${column}`} className="px-2 py-1 align-top">
                                {stringifyValue(value)}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {result.sql ? (
              <div>
                <p className="text-muted-foreground text-xs">Generated SQL</p>
                <pre className="overflow-x-auto rounded-md border bg-muted/40 p-2 text-xs">{result.sql}</pre>
              </div>
            ) : null}

            {result.debug ? (
              <div>
                <p className="text-muted-foreground text-xs">Debug</p>
                <pre className="overflow-x-auto rounded-md border bg-muted/40 p-2 text-xs">
                  {JSON.stringify(result.debug, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
