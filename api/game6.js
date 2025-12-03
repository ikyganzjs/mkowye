const axios = require("axios");

async function asahotak() {
  const URL = "https://raw.githubusercontent.com/ikyganzjs/kiwkow/refs/heads/main/tebakbendera.json";

  try {
    const response = await axios.get(URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
    });

    const data = response.data;
    const random = data[Math.floor(Math.random() * data.length)];
    return random;
  } catch (error) {
    console.error("Gagal mengambil data:", error.message);
    return null;
  }
}

module.exports = {
  name: "Tebak Bendera",
  desc: "Data soal tebak bendera",
  category: "Games",
  path: "/tebakbendera?apikey=",
  async run(req, res) {
    const { apikey } = req.query;

    if (!apikey || !global.apikey.includes(apikey))
      return res.json({ status: false, error: "Apikey invalid" });

    try {
      const result = await asahotak();
      if (!result)
        return res.status(500).json({ status: false, error: "Gagal mengambil data" });

      res.status(200).json({
        status: true,
        result,
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        error: error.message,
      });
    }
  },
};
