module.exports = {
  name: "Send Channel Reaction",
  desc: "reaction to a WhatsApp Channel",
  category: "Tools",
  path: "/wa/reaction?apikey=&link=&emoji=",

  async run(req, res) {
    const { apikey, link, emoji } = req.query;

    // Validasi APIKEY
    if (!global.apikey.includes(apikey)) 
      return res.json({ status: false, error: 'Apikey invalid' });

    // Validasi Param
    if (!link) 
      return res.json({ status: false, error: 'Missing link' });

    if (!emoji) 
      return res.json({ status: false, error: 'Missing emoji' });

    try {
      // Pisahkan emoji dengan koma: 😂,❤️,🔥
      const emojiList = emoji.split(",");

      // Contoh function react (bisa dipindah ke helpers)
      const axios = require("axios");

      const payload = {
        post_link: link,
        reactions: emojiList
      };

      const result = await axios.post(
        "https://asitha.top/api/send-reaction",
        payload,
        { headers: { "Content-Type": "application/json" } }
      );

      return res.json({
        creator: "IKY RESTAPI",
        status: true,
        result: result.data
      });

    } catch (err) {
      return res.json({
        creator: "IKY RESTAPI",
        status: false,
        error: "Failed to send reaction",
        details: err.message
      });
    }
  }
};
