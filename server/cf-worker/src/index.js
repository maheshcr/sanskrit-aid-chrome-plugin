/**
 * Sanskrit TTS Cache Worker
 *
 * Flow:
 *   1. Extension sends: GET /tts?text=रामः&voice=slow_clear_male
 *   2. Worker hashes (text + voice) → R2 key
 *   3. Cache HIT  → stream audio from R2
 *   4. Cache MISS → call HF Space API → store in R2 → return audio
 *
 * Compare to Lambda + S3:
 *   - No cold starts (V8 isolates, not containers)
 *   - R2 access is env.TTS_CACHE.get(key) — no AWS SDK, no credentials
 *   - Runs on 300+ edge locations, not a single region
 *   - No API Gateway, no function URLs, no execution roles
 */

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return corsResponse(new Response(null, { status: 204 }));
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return corsResponse(Response.json({ status: "ok" }));
    }

    // Main TTS endpoint
    if (url.pathname === "/tts") {
      return corsResponse(await handleTTS(request, env, url));
    }

    // Cache stats (optional, for debugging)
    if (url.pathname === "/stats") {
      return corsResponse(await handleStats(env));
    }

    return corsResponse(Response.json(
      { error: "Not found. Use GET /tts?text=रामः" },
      { status: 404 }
    ));
  },
};

// ---------------------------------------------------------------------------
// TTS handler
// ---------------------------------------------------------------------------

async function handleTTS(request, env, url) {
  const text = url.searchParams.get("text")?.trim();
  const voice = url.searchParams.get("voice") || env.DEFAULT_VOICE;

  // Validate input
  if (!text) {
    return Response.json({ error: "Missing 'text' parameter" }, { status: 400 });
  }

  const maxLen = parseInt(env.MAX_TEXT_LENGTH) || 100;
  if (text.length > maxLen) {
    return Response.json(
      { error: `Text too long (${text.length} chars, max ${maxLen})` },
      { status: 400 }
    );
  }

  // Rate limiting (simple per-IP, per-minute)
  const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
  const rateLimitOk = await checkRateLimit(env, clientIP);
  if (!rateLimitOk) {
    return Response.json(
      { error: "Rate limited. Try again in a minute." },
      { status: 429 }
    );
  }

  // Cache key: hash of text + voice
  const cacheKey = await hashKey(text, voice);
  const r2Key = `audio/${cacheKey}.wav`;

  // --- Check R2 cache ---
  const cached = await env.TTS_CACHE.get(r2Key);

  if (cached) {
    // Cache HIT — stream directly from R2
    // (Compare to S3: no pre-signed URLs, no GetObject SDK call)
    return new Response(cached.body, {
      headers: {
        "Content-Type": "audio/wav",
        "X-Cache": "HIT",
        "X-Cache-Key": cacheKey,
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  // --- Cache MISS — generate via HF Space ---
  let audioBytes;
  try {
    audioBytes = await generateFromHFSpace(env, text, voice);
  } catch (err) {
    return Response.json(
      { error: "TTS generation failed", detail: err.message },
      { status: 502 }
    );
  }

  // Store in R2 (non-blocking — don't wait for write to complete before responding)
  // This is like S3 putObject but... just this. No SDK. No credentials.
  const r2Promise = env.TTS_CACHE.put(r2Key, audioBytes.slice(0), {
    httpMetadata: { contentType: "audio/wav" },
    customMetadata: { text, voice, generatedAt: new Date().toISOString() },
  });

  // Return audio immediately, let R2 write finish in background
  // (Workers support waitUntil for this, but we need the execution context)
  await r2Promise;

  return new Response(audioBytes, {
    headers: {
      "Content-Type": "audio/wav",
      "X-Cache": "MISS",
      "X-Cache-Key": cacheKey,
      "Cache-Control": "public, max-age=86400",
    },
  });
}

// ---------------------------------------------------------------------------
// HF Space API client
// ---------------------------------------------------------------------------

async function generateFromHFSpace(env, text, voice) {
  const baseUrl = env.HF_SPACE_URL;
  const token = env.HF_TOKEN;

  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Step 1: Submit prediction
  const submitResp = await fetch(`${baseUrl}/gradio_api/call/predict`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ data: [text, voice] }),
  });

  if (!submitResp.ok) {
    throw new Error(`HF Space submit failed: ${submitResp.status}`);
  }

  const { event_id } = await submitResp.json();

  // Step 2: Poll SSE stream for result
  const sseResp = await fetch(
    `${baseUrl}/gradio_api/call/predict/${event_id}`,
    { headers }
  );

  if (!sseResp.ok) {
    throw new Error(`HF Space SSE failed: ${sseResp.status}`);
  }

  const sseText = await sseResp.text();
  const audioUrl = extractAudioUrl(sseText, baseUrl);

  if (!audioUrl) {
    throw new Error("No audio URL in HF Space response");
  }

  // Step 3: Download the audio file
  const audioResp = await fetch(audioUrl, { headers });

  if (!audioResp.ok) {
    throw new Error(`Audio download failed: ${audioResp.status}`);
  }

  const audioBuffer = await audioResp.arrayBuffer();

  // Sanity check: should start with RIFF (WAV header)
  const header = new Uint8Array(audioBuffer.slice(0, 4));
  const riff = String.fromCharCode(...header);
  if (riff !== "RIFF") {
    throw new Error(`Invalid audio: expected WAV, got ${riff}`);
  }

  return audioBuffer;
}

/**
 * Parse SSE stream to extract audio file URL.
 * The HF Space returns /g/gradio_api/file=... but /g/ doesn't work —
 * strip it to /gradio_api/file=...
 */
function extractAudioUrl(sseText, baseUrl) {
  for (const line of sseText.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const dataStr = line.slice(5).trim();
    if (!dataStr) continue;

    try {
      const parsed = JSON.parse(dataStr);
      if (Array.isArray(parsed) && parsed[0]?.url) {
        let url = parsed[0].url;
        // Fix the /g/ prefix issue
        url = url.replace("/g/gradio_api/", "/gradio_api/");
        return url;
      }
    } catch {
      // Not JSON, skip
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Rate limiting (simple in-memory via R2 metadata)
// ---------------------------------------------------------------------------

async function checkRateLimit(env, clientIP) {
  const limitPerMin = parseInt(env.RATE_LIMIT_PER_MINUTE) || 30;
  const now = Math.floor(Date.now() / 60000); // current minute
  const rlKey = `ratelimit/${clientIP}/${now}`;

  const existing = await env.TTS_CACHE.head(rlKey);
  const count = existing ? parseInt(existing.customMetadata?.count || "0") : 0;

  if (count >= limitPerMin) {
    return false;
  }

  // Increment (fire-and-forget)
  await env.TTS_CACHE.put(rlKey, "", {
    customMetadata: { count: String(count + 1) },
  });

  return true;
}

// ---------------------------------------------------------------------------
// Stats endpoint
// ---------------------------------------------------------------------------

async function handleStats(env) {
  const list = await env.TTS_CACHE.list({ prefix: "audio/", limit: 1000 });
  return Response.json({
    cachedAudioFiles: list.objects.length,
    truncated: list.truncated,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function hashKey(text, voice) {
  const data = new TextEncoder().encode(`${text}|${voice}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray.slice(0, 16))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function corsResponse(response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
