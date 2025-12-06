const axios = require("axios");

module.exports = {
  name: "ML Stalk",
  desc: "Mobile Legends Stalker",
  category: "Stalker",
  path: "/stalker/mlstalk?apikey=&uid=&zid=",

  async run(req, res) {
    const { apikey, uid, zid } = req.query;

    if (!global.apikey || !global.apikey.includes(apikey)) {
      return res.json({ status: false, error: "Apikey invalid" });
    }

    if (!uid || !zid) {
      return res.json({ status: false, error: "Missing uid or zid" });
    }

    try {
      const url = "https://api.duniagames.co.id/api/transaction/v1/top-up/inquiry";

      const headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "origin": "https://duniagames.co.id",
        "referer": "https://duniagames.co.id/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      };

      const payload = {
        catalogId: 271,
        gameId: uid,
        zoneId: zid,
        productId: 1,
        productRef: "AE",
        denom: 3  // denom VALID → agar inquiry sukses
      };

      const r = await axios.post(url, payload, { headers });

      const data = r?.data?.data?.gameDetail;

      if (!data) {
        return res.json({
          status: false,
          error: "User tidak ditemukan / Payload ditolak",
          details: r.data
        });
      }

      res.json({
        creator: "IKY RESTAPI",
        status: true,
        uid,
        zid,
        nickname: data.userName,
        region: data.serverName,
        raw: data
      });

    } catch (err) {
      res.json({
        creator: "IKY RESTAPI",
        status: false,
        error: "Gagal request ke DuniaGames",
        details: err?.response?.data || err.message
      });
    }
  }
};
