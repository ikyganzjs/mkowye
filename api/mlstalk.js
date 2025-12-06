const axios = require("axios");

module.exports = {
  name: "ML Stalk",
  desc: "Stalker Mobile Legends",
  category: "Stalker",
  path: "/game/mlstalk?apikey=&uid=&zid=",

  async run(req, res) {
    const { apikey, uid, zid } = req.query;

    // VALIDASI
    if (!global.apikey.includes(apikey)) 
      return res.json({ status: false, error: 'Apikey invalid' });

    if (!uid || !zid) 
      return res.json({ status: false, error: 'Missing uid or zid' });

    try {
      // UniPin API
      const url = "https://api.unipin.com/topup/get-game-user-info";

      const payload = {
        product_id: "mlbb",
        zone_id: zid,
        user_id: uid
      };

      const headers = {
        "Content-Type": "application/json",
        "Origin": "https://www.unipin.com",
        "Referer": "https://www.unipin.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      };

      const r = await axios.post(url, payload, { headers });

      if (!r.data || !r.data.data) {
        return res.json({ 
          status: false, 
          error: "User tidak ditemukan atau ID/ZID salah" 
        });
      }

      const data = r.data.data;

      res.json({
        status: true,
        uid,
        zid,
        nickname: data.userName,
        region: data.region || "Unknown",
        raw: data
      });

    } catch (err) {
      res.json({
        status: false,
        error: err.message
      });
    }
  }
};
