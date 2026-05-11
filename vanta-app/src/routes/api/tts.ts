import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            text?: string;
            apiKey?: string;
            voiceId?: string;
            modelId?: string;
            stability?: number;
            similarityBoost?: number;
            style?: number;
            speed?: number;
          };
          const { text } = body;
          if (!text || typeof text !== "string" || text.length < 1 || text.length > 4000) {
            return new Response(JSON.stringify({ error: "Invalid text" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Prefer user-provided key; fall back to server env if present
          const apiKey =
            (body.apiKey && body.apiKey.trim()) || process.env.ELEVENLABS_API_KEY;
          if (!apiKey) {
            return new Response(
              JSON.stringify({
                error:
                  "Missing ElevenLabs API key. Add your key in chat settings.",
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          const voiceId = (body.voiceId && body.voiceId.trim()) || DEFAULT_VOICE_ID;
          const modelId = body.modelId || "eleven_multilingual_v2";

          const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
          const r = await fetch(url, {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text,
              model_id: modelId,
              voice_settings: {
                stability: body.stability ?? 0.5,
                similarity_boost: body.similarityBoost ?? 0.75,
                style: body.style ?? 0.3,
                use_speaker_boost: true,
                speed: body.speed ?? 1.0,
              },
            }),
          });

          if (!r.ok) {
            const t = await r.text();
            console.error("ElevenLabs error", r.status, t);
            return new Response(
              JSON.stringify({ error: `TTS failed (${r.status}): ${t.slice(0, 200)}` }),
              {
                status: 502,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          const buf = await r.arrayBuffer();
          return new Response(buf, {
            headers: {
              "Content-Type": "audio/mpeg",
              "Cache-Control": "no-store",
            },
          });
        } catch (e) {
          console.error("/api/tts error", e);
          return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
