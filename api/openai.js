const fetch = require("node-fetch");

const Apis = ["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"];
const GROQ_API_KEY = Apis[Math.floor(Math.random() * Apis.length)];

// Konfigurasi Telegram
const TELEGRAM_BOT_TOKEN = "8490105100:AAGbLVP4o7IZapzg3-aLzmZmlft61mYaas4";
const TELEGRAM_CHAT_ID = "5995543569";

async function sendTelegram(message) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown"
      })
    });
  } catch (e) {
    console.error("[Telegram Error]", e.message);
  }
}

async function askGroq(prompt, question, model = "moonshotai/kimi-k2-instruct-0905") {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: question }
        ]
      })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response from model.";
  } catch (error) {
    console.error("Error:", error);
    return "Error while fetching response.";
  }
}

const createAIEndpoint = (name, desc, path, modelName) => ({
  name,
  desc,
  category: "Openai",
  path,
  async run(req, res) {
    const { apikey, question } = req.query;

    if (!apikey || !global.apikey.includes(apikey))
      return res.json({ status: false, error: "Apikey invalid" });

    if (!question)
      return res.json({ status: false, error: "Parameter 'question' is required" });

    try {
      const result = await askGroq("", question, modelName);

      // Kirim notifikasi Telegram
      sendTelegram(`🧠 *${name}*\nQuestion: ${question}\nResult: ${result.slice(0, 300)}...`);

      res.status(200).json({ status: true, result });
    } catch (err) {
      res.status(500).json({ status: false, error: err.message });
    }
  }
});

module.exports = [
  createAIEndpoint("Grok V1", "Ai grok v1 models", "/ai/grokv1?apikey=&question=", "compound-beta"),
  createAIEndpoint("Grok V2", "Ai grok v2 models", "/ai/grokv2?apikey=&question=", "groq/compound-mini"),
  createAIEndpoint("Grok V3", "Ai grok V3 models", "/ai/grokv3?apikey=&question=", "groq/compound"),
  createAIEndpoint("Meta V1", "Ai meta v1 models", "/ai/metav1?apikey=&question=", "llama-3.1-8b-instant"),
  createAIEndpoint("Meta V2", "Ai meta v2 models", "/ai/metav2?apikey=&question=", "llama-3.3-70b-versatile"),
  createAIEndpoint("Meta V3", "Ai meta v3 models", "/ai/metav3?apikey=&question=", "meta-llama/llama-4-maverick-17b-128e-instruct"),
  createAIEndpoint("Meta V4", "Ai meta v4 models", "/ai/metav4?apikey=&question=", "meta-llama/llama-4-scout-17b-16e-instruct"),
  createAIEndpoint("Moon V1", "Ai moon v1 models", "/ai/moonv1?apikey=&question=", "moonshotai/kimi-k2-instruct"),
  createAIEndpoint("Moon V2", "Ai moon v2 models", "/ai/moonv2?apikey=&question=", "moonshotai/kimi-k2-instruct-0905"),
  createAIEndpoint("Chat GPT V1", "Ai chat gpt v1 models", "/ai/chatgptv1?apikey=&question=", "openai/gpt-oss-120b"),
  createAIEndpoint("Chat GPT V2", "Ai chat gpt v2 models", "/ai/chatgptv2?apikey=&question=", "openai/gpt-oss-20b")
];
