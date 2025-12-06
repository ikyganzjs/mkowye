const axios = require("axios");

module.exports = {
  name: "ML Stalk",
  desc: "Stalking Mobile Legends",
  category: "Stalker",
  path: "/stalker/mlstalk?apikey=&uid=&zid=",

  async run(req, res) {
    const { apikey, uid, zid } = req.query;

    // VALIDASI APIKEY
    if (!apikey || !global.apikey.includes(apikey)) {
      return res.json({ status: false, error: "Apikey invalid" });
    }

    if (!uid || !zid) {
      return res.json({ status: false, error: "Missing uid or zid" });
    }

    try {
      const url = "https://api.duniagames.co.id/api/transaction/v1/top-up/inquiry";

      const headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Origin": "https://duniagames.co.id",
        "Referer": "https://duniagames.co.id/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      };

      const payload = {
        "catalogId": 271,          // MLBB catalog ID
        "gameId": uid,             // User ID
        "zoneId": zid,             // Zone ID
        "productId": 1,            // Default
        "productRef": "AE",
        "denom": 1                 // Tidak berpengaruh, hanya agar inquiry berjalan
      };

      const r = await axios.post(url, payload, { headers });

      if (!r.data || !r.data.data || !r.data.data.gameDetail) {
        return res.json({ status: false, error: "User tidak ditemukan" });
      }

      const info = r.data.data.gameDetail;

      res.json({
        creator: "IKY RESTAPI",
        status: true,
        uid,
        zid,
        nickname: info.userName,
        region: info.serverName || "Unknown",
        raw: info
      });

    } catch (err) {
      res.json({
        creator: "IKY RESTAPI",
        status: false,
        error: "Failed to request DuniaGames",
        details: err?.response?.data || err.message
      });
    }
  }
};
