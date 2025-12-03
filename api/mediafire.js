const axios = require("axios");
const cheerio = require("cheerio");

async function getMediafireLink(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Accept: "text/html,application/xhtml+xml",
        "accept-language": "id-ID,id;q=0.9",
        referer: "https://www.mediafire.com/",
        "upgrade-insecure-requests": "1",
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Cari tombol download
    let directLink =
      $("#downloadButton").attr("href") ||
      $("a#download_link").attr("href") ||
      $("a[href*='download']").attr("href");

    if (!directLink) {
      // fallback kalau tidak ketemu
      const match = html.match(/(https?:\/\/download[^'"]+)/);
      if (match) directLink = match[1];
    }

    if (!directLink) {
      return {
        status: false,
        message: "Gagal menemukan link download MediaFire",
      };
    }

    // Ambil detail tambahan
    const title = $("div.filename").text().trim() || $("title").text().trim();
    const size = $("ul.details li:contains('Size')").text().replace("Size:", "").trim() || "Unknown";
    const uploaded = $("ul.details li:contains('Uploaded')").text().replace("Uploaded:", "").trim() || "Unknown";

    return {
      status: true,
      title,
      size,
      uploaded,
      directLink,
    };
  } catch (err) {
    console.error("Error scraping MediaFire:", err.message);
    return {
      status: false,
      message: "Terjadi kesalahan saat mengakses halaman MediaFire",
      error: err.message,
    };
  }
}

module.exports = {
  name: "MediaFire Downloader",
  desc: "Scrape & ambil direct download link dari MediaFire",
  category: "Downloader",
  path: "/api/download/mediafire?apikey=&url=",
  async run(req, res) {
    try {
      const { apikey, url } = req.query;

      // Validasi
      if (!apikey || !global.apikey.includes(apikey)) {
        return res.status(403).json({
          status: false,
          message: "API key tidak valid!",
        });
      }

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Masukkan parameter 'url'",
        });
      }

      // Jalankan fungsi scrape
      const result = await getMediafireLink(url);
      res.json({
        creator: "IKY RESTAPI",
        ...result,
      });
    } catch (error) {
      console.error("Error handler:", error);
      res.status(500).json({
        status: false,
        message: "Terjadi kesalahan pada server",
        error: error.message,
      });
    }
  },
};
