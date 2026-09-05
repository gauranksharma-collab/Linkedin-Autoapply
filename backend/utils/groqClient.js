const axios = require("axios");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const TEXT_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const VISION_MODEL = process.env.GROQ_VISION_MODEL || "qwen/qwen3.6-27b";

function parseJson(content) {
  const match = content.match(/[[{][\s\S]*[\]}]/);
  return JSON.parse(match ? match[0] : content);
}

async function askGroqMessages(messages, { model = TEXT_MODEL, jsonMode = false } = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");

  const body = { model, messages };
  if (jsonMode) body.response_format = { type: "json_object" };

  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await axios.post(GROQ_URL, body, {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        timeout: 30000,
      });
      const content = res.data?.choices?.[0]?.message?.content;
      if (!content) throw new Error("Groq response had no content");
      return content;
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      const isRetryable = !status || status >= 500;
      if (attempt === 0 && isRetryable) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function askGroq(prompt) {
  return askGroqMessages([{ role: "user", content: prompt }]);
}

async function askGroqForJson(prompt) {
  const content = await askGroqMessages([{ role: "user", content: prompt }], { jsonMode: true });
  return parseJson(content);
}

async function askGroqVisionForJson(prompt, base64Data, mimeType) {
  const content = await askGroqMessages(
    [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } },
        ],
      },
    ],
    { model: VISION_MODEL, jsonMode: true }
  );
  return parseJson(content);
}

module.exports = { askGroq, askGroqForJson, askGroqVisionForJson };
