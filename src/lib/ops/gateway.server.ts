// LLMProvider abstraction. Today every model is served through the Lovable AI
// gateway (OpenAI-compatible), but the interface is provider-agnostic so an
// OpenAI, Anthropic, Gemini or self-hosted endpoint can be swapped in per model
// config without touching the agent graph.
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
  name?: string;
}

export interface ChatResult {
  message: {
    content: string | null;
    tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
  };
  usage: { prompt_tokens: number; completion_tokens: number };
  finish_reason: string;
}

export class GatewayError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryable: boolean,
  ) {
    super(message);
    this.name = "GatewayError";
  }
}

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export async function chatCompletion(opts: {
  model: string;
  messages: ChatMessage[];
  tools?: unknown[];
  toolChoice?: "auto" | "required" | "none";
  temperature?: number;
  maxTokens?: number;
}): Promise<ChatResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new GatewayError(401, "AI gateway key is not configured.", false);

  const isGpt5Family = opts.model.startsWith("openai/gpt-5") || opts.model.startsWith("openai/gpt-6");
  const body: any = {
    model: opts.model,
    messages: opts.messages,
  };
  if (opts.tools?.length) {
    body.tools = opts.tools;
    body.tool_choice = opts.toolChoice ?? "auto";
  }
  if (isGpt5Family) {
    body.max_completion_tokens = opts.maxTokens ?? 2000;
    if (opts.model.includes("gpt-5.6")) body.reasoning_effort = "none";
  } else {
    body.max_tokens = opts.maxTokens ?? 2000;
    body.temperature = opts.temperature ?? 0.2;
  }

  let lastError: GatewayError | null = null;
  // Bounded retry: only 429/5xx are retryable per the gateway contract.
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const json: any = await res.json();
      const choice = json.choices?.[0];
      return {
        message: {
          content: choice?.message?.content ?? null,
          tool_calls: choice?.message?.tool_calls ?? undefined,
        },
        usage: {
          prompt_tokens: json.usage?.prompt_tokens ?? 0,
          completion_tokens: json.usage?.completion_tokens ?? 0,
        },
        finish_reason: choice?.finish_reason ?? "stop",
      };
    }

    const text = await res.text();
    const retryable = res.status === 429 || res.status >= 500;
    const message =
      res.status === 402
        ? "AI credits are exhausted for this workspace. Add credits to continue running investigations."
        : res.status === 403
          ? "AI access is blocked by workspace policy."
          : `AI gateway error ${res.status}: ${text.slice(0, 300)}`;
    lastError = new GatewayError(res.status, message, retryable);
    if (!retryable) throw lastError;
    const retryAfter = Number(res.headers.get("Retry-After") ?? 0);
    const delay = retryAfter > 0 ? retryAfter * 1000 : 600 * Math.pow(2, attempt) + Math.random() * 250;
    await new Promise((r) => setTimeout(r, delay));
  }
  throw lastError ?? new GatewayError(500, "AI gateway is unavailable.", true);
}
