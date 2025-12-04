const axios = require("axios");

function getRandomIP() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.');
}

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/58.0.3029.110 Safari/537.3",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) Safari/602.3.12",
  "Mozilla/5.0 (Linux; Android 8.0.0; Pixel 2 XL) Chrome/67.0.3396.87"
];

// ==========================================
// FUNGSI CORE – INTERNAL USE ONLY
// ==========================================

async function searchJobs(keyword, location) {
  const token = global.linkedinToken;
  if (!token) return { error: "Access token not found" };

  const headers = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/json",
    "X-Forwarded-For": getRandomIP(),
    "User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)]
  };

  const url =
    `https://api.linkedin.com/v2/jobSearch` +
    `?q=keywords` +
    `&keywords=${encodeURIComponent(keyword)}` +
    `&location=${encodeURIComponent(location)}` +
    `&count=20`;

  try {
    const { data } = await axios.get(url, { headers });

    const jobs = data?.elements?.map(job => ({
      job_id: job.id,
      title: job.title,
      company: job.companyName,
      location: job.formattedLocation,
      listed_at: job.listedAt,
      link: job.jobPostingUrl
    })) || [];

    return jobs;

  } catch (err) {
    return { error: err?.response?.data || err.message };
  }
}

// ==========================================
// EXPORT MODULE (FORMAT MIRIP TTS)
// ==========================================

module.exports = {
  name: "LinkedIn",
  desc: "Solusi Anda mencari lowongan kerja melalui API LinkedIn",
  category: "Tools",
  path: "/tools/linkedIn?apikey=&keyword=&location=",

  // =============================
  // 1. ROUTE SEARCH JOB (MAIN)
  // =============================
  async run(req, res) {
    const { apikey, keyword, location } = req.query;

    if (!apikey || !global.apikey.includes(apikey))
      return res.json({ status: false, error: 'Apikey invalid' });

    if (!keyword)
      return res.json({ status: false, error: 'Keyword is required' });

    const loc = location || "Indonesia";
    const result = await searchJobs(keyword, loc);

    if (result.error)
      return res.json({ status: false, error: result.error });

    res.json({
      status: true,
      result
    });
  },

  // =============================
  // 2. LOGIN URL
  // =============================
  login(req, res) {
    const client_id = process.env.LINKEDIN_CLIENT_ID;
    const redirect = process.env.LINKEDIN_REDIRECT;
    const scope = encodeURIComponent("r_liteprofile r_emailaddress");

    const url =
      `https://www.linkedin.com/oauth/v2/authorization?response_type=code` +
      `&client_id=${client_id}` +
      `&redirect_uri=${redirect}` +
      `&scope=${scope}`;

    res.redirect(url);
  },

  // =============================
  // 3. CALLBACK
  // =============================
  callback(req, res) {
    const { code } = req.query;
    if (!code)
      return res.json({ status: false, error: "Code not found" });

    global.linkedinCode = code;

    res.json({
      status: true,
      message: "LinkedIn code received",
      code
    });
  },

  // =============================
  // 4. GET ACCESS TOKEN
  // =============================
  async getAccessToken(req, res) {
    const code = global.linkedinCode;
    if (!code)
      return res.json({ status: false, error: "No stored code" });

    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", process.env.LINKEDIN_REDIRECT);
    params.append("client_id", process.env.LINKEDIN_CLIENT_ID);
    params.append("client_secret", process.env.LINKEDIN_CLIENT_SECRET);

    try {
      const { data } = await axios.post(
        "https://www.linkedin.com/oauth/v2/accessToken",
        params,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      global.linkedinToken = data.access_token;

      res.json({
        status: true,
        access_token: data.access_token,
        expires_in: data.expires_in
      });

    } catch (err) {
      res.json({
        status: false,
        error: err.response?.data || err.message
      });
    }
  }
};
