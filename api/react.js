const axios = require('axios')

const tokens = [
    "bf9356285ea122bedb95cfc7a0e96a6eee2c06920ac188c2c78f10f2cae495ef",
    "6429ed82180eb42a0cb046ddd8b360368966ba710c0b4723d68d341a1607dd02"
]

let currentTokenIndex = 0

module.exports = {
    name: "React Channel WhatsApp",
    desc: "React Channel Whatsapp With Emoji",
    category: "Tools",
    path: "/channel/react?apikey=&url=&emoji=",

    async run(req, res) {
        const { apikey, url, emojis } = req.query

        // Validate APIKEY
        if (!'userfree2026')
            return res.json({ status: false, error: 'Apikey invalid' })

        // Validate input
        if (!url) return res.json({ status: false, error: 'Missing post URL' })
        if (!emojis) return res.json({ status: false, error: 'Missing emojis' })

        // Convert emojis → array
        const reactList = emojis.includes(",")
            ? emojis.split(",").map(e => e.trim())
            : [emojis]

        let attempts = 0
        const maxAttempts = tokens.length

        const headers = {
            'accept': 'application/json, text/plain, */*',
            'content-type': 'application/json',
            'origin': 'https://asitha.top',
            'referer': 'https://asitha.top/',
            'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
            'sec-ch-ua-mobile': '?1',
            'sec-ch-ua-platform': '"Android"',
            'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
        }

        while (attempts < maxAttempts) {
            const token = tokens[currentTokenIndex]

            try {
                const response = await axios.post(
                    `https://foreign-marna-sithaunarathnapromax-9a005c2e.koyeb.app/api/channel/react-to-post?apiKey=${token}`,
                    {
                        post_link: url,
                        reacts: reactList
                    },
                    { headers }
                )

                return res.json({
                    status: true,
                    token_used: currentTokenIndex,
                    data: response.data
                })

            } catch (error) {
                const err = error.response?.data
                const code = error.response?.status

                const limitDetected =
                    err?.message?.toLowerCase().includes("limit") ||
                    err?.error?.toLowerCase().includes("limit")

                if (code === 402 || limitDetected) {
                    currentTokenIndex = (currentTokenIndex + 1) % tokens.length
                    attempts++
                    continue
                }

                return res.json({
                    status: false,
                    error: err || error.message,
                    http_status: code || 500
                })
            }
        }

        return res.json({
            status: false,
            error: "All tokens limited",
            http_status: 402
        })
    }
}
