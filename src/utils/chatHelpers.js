import ChatHistory from "../models/ChatHistory.js";


export const getContext = (chat, limit = 10) => {
  if (!chat) return [];
  return chat.messages.slice(-limit).map((m) => ({ sender: m.sender, text: m.text }));
};

export const saveChatToDB = async (userId, userMessage, botReply, sessionId = null) => {
  let chat = await ChatHistory.findOne({ userId, sessionId });
  if (!chat) chat = new ChatHistory({ userId, sessionId, messages: [] });

  chat.messages.push({ sender: "user", text: userMessage });
  chat.messages.push({ sender: "bot", text: botReply });
  await chat.save();
};

export const getBotReplyWithTimeout = async (userMessage, context = [], modelURL, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(modelURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userMessage, context }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) throw new Error("AI server returned error");
    const data = await res.json();
    return data.reply || "Sorry, I cannot answer that right now.";
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") throw new Error("AI model timeout");
    throw err;
  }
};
