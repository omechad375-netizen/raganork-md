const { Module } = require("../main");
const axios = require("axios");
const config = require("../config");
const fromMe = config.MODE == "public" ? false : true;
function sanitizeFilename(name) {
  if (!name) return "file";
  return name
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 180);
}
Module(
  {
    pattern: "modapk ?(.*)",
    fromMe,
    desc: "Search & Download MOD APKs. Reply with number to download",
    type: "downloader",
    use: "utility",
  },
  async (m, match) => {
    const query = match && match[1] ? match[1].trim() : "";
    if (!query)
      return await m.sendReply(
        "❌ _Provide a search query!_\n\nExample: `.modapk Auto Clicker`"
      );
    await m.sendReply(`_Searching for "${query}"_`);
    try {
      const res = await axios.get("https://api.raganork.site/api/modapk", {
        params: { query },
        timeout: 15000,
      });
      const data = res.data;
      if (!Array.isArray(data) || data.length === 0)
        return await m.sendReply("_No results found!_");
      const results = data.slice(0, 10);
      let text = `MODAPK results for "${query}"\n\n`;
      results.forEach((it, i) => {
        text += `${i + 1}. _*${it.title || it.name || "Unknown"}*_\n`;
        if (it.version) text += `   *_Version:_* ${it.version}\n`;
        if (it.size) text += `   *_Size:_* ${it.size}\n`;
        if (it.desc) text += `   *_Description:_* ${it.desc}\n`;
        text += "\n";
      });
      text += `_Reply to this message with the number (1-${results.length}) to download the APK._`;
      await m.sendMessage(text, "text");
    } catch (err) {
      console.error("modapk search error:", err?.message || err);
      return await m.sendReply(
        "_Failed to search APKs. Please try again later._"
      );
    }
  }
);
Module(
  {
    on: "text",
    fromMe,
  },
  async (message) => {
    try {
      if (
        !message.reply_message ||
        message.reply_message.data.key.remoteJid !== message.jid
      )
        return;
      const origText =
        (message.reply_message.message &&
          message.reply_message.message.conversation) ||
        message.reply_message.text ||
        "";
      if (typeof origText !== "string") return;
      const qMatch = origText.match(/MODAPK results for\s*"([^"\n]+)"/i);
      if (!qMatch) return;
      const query = qMatch[1].trim();
      const text = (message.message || "").trim();
      if (!/^\d+$/.test(text)) return;
      const selectedText = origText.match(new RegExp(`^${text}\\. _\\*(.+?)\\*_`, "m"))?.[1];
      const selected = parseInt(text, 10);
      if (isNaN(selected) || selected < 1) {
        try {
          await message.edit(
            "❌ _Invalid selection. Reply with a valid number._",
            message.jid,
            message.reply_message.data.key
          );
        } catch (e) {}
        return false;
      }
      try {
        await message.edit(
          `⏳ _Downloading ${selectedText} APK_`,
          message.jid,
          message.reply_message.data.key
        );
      } catch (e) {}
      let dlResp;
      try {
        dlResp = await axios.get("https://api.raganork.site/api/modapk", {
          params: { query, index: selected },
          timeout: 20000,
        });
      } catch (e) {
        console.error("modapk download api error:", e?.message || e);
        try {
          await message.edit(
            "❌ _Failed to fetch download link._",
            message.jid,
            message.reply_message.data.key
          );
        } catch (err) {}
        return false;
      }
      const downloadUrl =
        dlResp?.data?.url;
      if (!downloadUrl) {
        try {
          await message.edit(
            "❌ _Download link not found._",
            message.jid,
            message.reply_message.data.key
          );
        } catch (e) {}
        return false;
      }
      const filenameBase = selectedText || query;
      const filename = `${sanitizeFilename(filenameBase)}.apk`;
      try {
        await message.sendMessage({ url: downloadUrl }, "document", {
          fileName: filename,
          mimetype: "application/vnd.android.package-archive",
          quoted: message.data,
        });
        try {
          await message.edit(
            `✅ _Sent: ${filename}_`,
            message.jid,
            message.reply_message.data.key
          );
        } catch (e) {}
      } catch (e) {
        console.error("modapk send error:", e?.message || e);
        try {
          await message.edit(
            `❌ _Failed to send APK: ${e.message || e}_`,
            message.jid,
            message.reply_message.data.key
          );
        } catch (err) {}
      }
    } catch (err) {
      console.error("modapk handler error:", err?.message || err);
    }
  }
);
