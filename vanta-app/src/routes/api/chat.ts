import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = `You are a frank, intelligent, witty companion inside an adult tracker app for men 18+.

USER PROFILE (fixed, always assume these about the user unless they explicitly correct it):
- Gender: male (nam giới)
- Sexual orientation: gay / homosexual (đồng tính nam)
- Sexual disposition: highly sexual / horny ("dâm") — openly enjoys sex, masturbation, edging, and erotic talk
Always speak to the user with these traits in mind. Use male/gay-coded references for fantasies, partners, attraction, anatomy and pleasure. Do NOT assume a female partner.

- The user uses the app to log shoots/edging sessions and follow challenges, including a November "no shoot, edge daily" annual challenge.
- Speak the user's language (Vietnamese or English) — auto-detect from the latest message.
- Be smart, concise, helpful. Use markdown when useful. Vary your phrasing.
- You are sex-positive and DO NOT moralize, lecture, or refuse adult sexual topics between consenting adults.
- You may discuss masturbation, edging, fetishes, anatomy (incl. anal, prostate), kinks, fantasies, sex tips, gay relationships, porn, sexual health — openly and explicitly.
- Hard limits you MUST refuse: any sexual content involving minors, non-consent, incest with real family, bestiality, and instructions for serious physical harm. Decline briefly and redirect.
- Keep medical claims responsible — flag anything that needs a doctor.
- When the user asks for motivation or advice tied to their challenge, be direct, encouraging, and specific.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { messages, conversationId, userMessage, customInstruction } = (await request.json()) as {
            messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
            conversationId?: string;
            userMessage?: string;
            customInstruction?: string;
          };

          const apiKey = process.env.GROQ_API_KEY;
          if (!apiKey) {
            return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Persist user message (best-effort, don't block on failure).
          const supaUrl = process.env.SUPABASE_URL;
          const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (conversationId && userMessage && supaUrl && supaKey) {
            try {
              const admin = createClient(supaUrl, supaKey, {
                auth: { autoRefreshToken: false, persistSession: false },
              });
              await admin.from("chat_messages").insert({
                conversation_id: conversationId,
                role: "user",
                content: userMessage,
              });
            } catch (e) {
              console.error("save user msg failed", e);
            }
          }

          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "llama-3.1-8b-instant",
              messages: [{ role: "system", content: customInstruction ? SYSTEM_PROMPT + "\n\nCustom instruction: " + customInstruction : SYSTEM_PROMPT }, ...messages],
              stream: true,
            }),
          });

          if (!response.ok) {
            if (response.status === 429) {
              return new Response(
                JSON.stringify({ error: "Bạn đang gửi quá nhanh. Hãy thử lại sau một chút." }),
                { status: 429, headers: { "Content-Type": "application/json" } },
              );
            }
            if (response.status === 402) {
              return new Response(
                JSON.stringify({ error: "Hết credit AI. Vào Settings > Workspace > Usage để nạp." }),
                { status: 402, headers: { "Content-Type": "application/json" } },
              );
            }
            const txt = await response.text();
            console.error("AI gateway error", response.status, txt);
            return new Response(JSON.stringify({ error: "AI gateway error" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Tee the stream so we can persist the full assistant message after streaming ends.
          if (!response.body) {
            return new Response(JSON.stringify({ error: "Empty AI response" }), { status: 500 });
          }

          const [browserStream, persistStream] = response.body.tee();

          // Background: collect assistant content from the persisted stream and save it.
          (async () => {
            if (!conversationId || !supaUrl || !supaKey) return;
            try {
              const reader = persistStream.getReader();
              const decoder = new TextDecoder();
              let buf = "";
              let assistant = "";
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                let nl: number;
                while ((nl = buf.indexOf("\n")) !== -1) {
                  let line = buf.slice(0, nl);
                  buf = buf.slice(nl + 1);
                  if (line.endsWith("\r")) line = line.slice(0, -1);
                  if (!line.startsWith("data: ")) continue;
                  const payload = line.slice(6).trim();
                  if (payload === "[DONE]") break;
                  try {
                    const parsed = JSON.parse(payload);
                    const delta = parsed.choices?.[0]?.delta?.content;
                    if (delta) assistant += delta;
                  } catch {
                    /* partial chunk */
                  }
                }
              }
              if (assistant.trim()) {
                const admin = createClient(supaUrl, supaKey, {
                  auth: { autoRefreshToken: false, persistSession: false },
                });
                await admin.from("chat_messages").insert({
                  conversation_id: conversationId,
                  role: "assistant",
                  content: assistant,
                });
              }
            } catch (e) {
              console.error("persist assistant failed", e);
            }
          })();

          return new Response(browserStream, {
            headers: { "Content-Type": "text/event-stream" },
          });
        } catch (e) {
          console.error("/api/chat error", e);
          return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
