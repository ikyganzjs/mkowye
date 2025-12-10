const axios = require('axios')

const tokens = [
    "bf9356285ea122bedb95cfc7a0e96a6eee2c06920ac188c2c78f10f2cae495ef",
    "6429ed82180eb42a0cb046ddd8b360368966ba710c0b4723d68d341a1607dd02"
]

let currentTokenIndex = 0

async function reactToPost(postUrl, emojis) {
    let attempts = 0
    const maxAttempts = tokens.length

    while (attempts < maxAttempts) {
        const apiKey = tokens[currentTokenIndex]
        
        try {
            console.log(`🎯 Reacting to: ${postUrl}`)
            console.log(`🎭 With emojis: ${emojis}`)
            console.log(`🔑 Using token index: ${currentTokenIndex}`)

            const response = await axios({
                method: 'POST',
                url: `https://foreign-marna-sithaunarathnapromax-9a005c2e.koyeb.app/api/channel/react-to-post?apiKey=${apiKey}`,
                headers: {
                    'authority': 'foreign-marna-sithaunarathnapromax-9a005c2e.koyeb.app',
                    'accept': 'application/json, text/plain, */*',
                    'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                    'content-type': 'application/json',
                    'origin': 'https://asitha.top',
                    'referer': 'https://asitha.top/',
                    'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
                    'sec-ch-ua-mobile': '?1',
                    'sec-ch-ua-platform': '"Android"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'cross-site',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
                },
                data: {
                    post_link: postUrl,
                    reacts: Array.isArray(emojis) ? emojis : [emojis]
                }
            })

            console.log('✅ Success!')
            return {
                success: true,
                data: 'Done Sayang....🤭'
            }

        } catch (error) {
            console.log(`❌ Token ${currentTokenIndex} failed:`, error.response?.data || error.message)
            
            if (error.response && error.response.status === 402) {
                currentTokenIndex = (currentTokenIndex + 1) % tokens.length
                attempts++
                console.log(`🔄 Switching to token index: ${currentTokenIndex}`)
                continue
            }

            if (error.response?.data?.message?.includes('limit') || error.response?.data?.message?.includes('Limit')) {
                currentTokenIndex = (currentTokenIndex + 1) % tokens.length
                attempts++
                console.log(`🔄 Token limit, switching to index: ${currentTokenIndex}`)
                continue
            }

            console.log('❌ Failed!')
            return {
                success: false,
                error: error.response?.data || error.message,
                status: error.response?.status
            }
        }
    }

    console.log('❌ All tokens limited!')
    return {
        success: false,
        error: 'All tokens are limited',
        status: 402
    }
}

module.exports = {
    name: "React Channel WhatsApp",
    desc: "React Emoji To WhatsApp",
    category: "Tools",
    path: "/tools/react?apikey=&url=&emojis=",

    async run(req, res) {
        const { apikey, url, emojis } = req.query

        // APIKEY SYSTEM VERSION IKY
        if (!'free')
            return res.json({ status: false, error: 'Apikey invalid' })

        if (!url) return res.json({ status: false, error: 'Missing url (post link)' })
        if (!emojis) return res.json({ status: false, error: 'Missing emojis' })

        // Jalankan function asli (tidak diubah)
        const result = await reactToPost(url, emojis.includes(",") ? emojis.split(",") : emojis)

        return res.json(result)
    }
}
