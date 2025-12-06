const axios = require("axios");

module.exports = {
  name: "ML Stalk",
  desc: "Stalker Mobile Legends",
  category: "Stalker",
  path: "/stalker/mlstalk?apikey=&uid=&zid=",

  async run(req, res) {
    const { apikey, uid, zid } = req.query;

    if (!apikey || !global.apikey.includes(apikey))
      return res.json({ status: false, error: 'Apikey invalid' });

    if (!uid || !zid)
      return res.json({ status: false, error: 'Missing uid or zid' });

    try {
      const url = "https://api.unipin.com/topup/get-game-user-info";

      const payload = {
        product_id: "mlbb",
        zone_id: zid,
        user_id: uid
      };

      const headers = {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/json;charset=UTF-8",
        "Origin": "https://www.unipin.com",
        "Referer": "https://www.unipin.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
        "Sec-Fetch-Site": "same-site",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty"
      };

      const r = await axios.post(url, payload, { headers });

      if (!r.data || !r.data.data) {
        return res.json({ 
          status: false, 
          error: "User tidak ditemukan" 
        });
      }

      res.json({
        status: true,
        uid,
        zid,
        nickname: r.data.data.userName,
        region: r.data.data.region || "Unknown",
      });

    } catch (err) {
      res.json({
        status: false,
        error: "Failed to request UniPin",
        details: err?.response?.data || err.message
      });
    }
  }
};
