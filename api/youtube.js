const fetch = require("node-fetch");
const cheerio = require("cheerio");

const yt = {
    cookieJar: '',
    userAgents: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
    ],
    
    get baseUrl() {
        return {
            origin: 'https://ssvid.net'
        }
    },

    // AMBIL COOKIE BARU - PENTING BANGET TAI!
    async refreshCookie() {
        try {
            console.log('🔄 REFRESH COOKIE...')
            const randomUA = this.userAgents[Math.floor(Math.random() * this.userAgents.length)]
            
            const response = await fetch(this.baseUrl.origin, {
                headers: {
                    'user-agent': randomUA,
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'accept-language': 'en-US,en;q=0.5',
                    'accept-encoding': 'gzip, deflate, br',
                    'dnt': '1',
                    'upgrade-insecure-requests': '1',
                    'sec-fetch-dest': 'document',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-site': 'none',
                    'cache-control': 'max-age=0'
                }
            })
            
            // Ambil cookies dari response headers
            const cookies = response.headers.raw()['set-cookie']
            if (cookies && cookies.length > 0) {
                // Parse cookies: ambil nama=value doang, buang atribut
                this.cookieJar = cookies.map(c => {
                    const parts = c.split(';')[0]
                    return parts
                }).join('; ')
                
                console.log('✅ COOKIE DAPET:', this.cookieJar)
            } else {
                // Fallback cookie kalo gak dapet (contoh doang, mungkin kadaluarsa)
                this.cookieJar = '__cf_bm=xxx; PHPSESSID=xxx; _ga=xxx; _gid=xxx'
                console.log('⚠️ PAKE COOKIE FALLBACK')
            }
            
            // Juga ambil token CF kalo ada
            const html = await response.text()
            const cfTokenMatch = html.match(/name="cf_token" value="([^"]+)"/)
            this.cfToken = cfTokenMatch ? cfTokenMatch[1] : ''
            
            return this.cookieJar
        } catch (e) {
            console.log('❌ GAGAL AMBIL COOKIE:', e.message)
            return ''
        }
    },

    get baseHeaders() {
        return {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'origin': this.baseUrl.origin,
            'referer': this.baseUrl.origin + '/youtube-to-mp3',
            'user-agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)],
            'cookie': this.cookieJar,
            'x-requested-with': 'XMLHttpRequest',
            'accept': 'application/json, text/javascript, */*; q=0.01',
            'accept-language': 'en-US,en;q=0.9',
            'cache-control': 'no-cache',
            'pragma': 'no-cache',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin'
        }
    },

    validateFormat: function (userFormat) {
        const validFormat = ['mp3', '144p', '240p', '360p', '480p', '720p', '1080p']
        if (!validFormat.includes(userFormat)) throw Error(`Format ${userFormat} gak valid! Pilih: ${validFormat.join(', ')}`)
    },

    handleFormat: function (userFormat, searchJson) {
        this.validateFormat(userFormat)
        let result
        
        console.log('🔍 PARSING FORMAT:', userFormat)
        console.log('📦 LINKS TERSEDIA:', JSON.stringify(searchJson.links, null, 2))
        
        if (userFormat == 'mp3') {
            // MP3 - ambil kualitas terbaik
            if (searchJson.links?.mp3) {
                const mp3Formats = Object.values(searchJson.links.mp3)
                if (mp3Formats.length > 0) {
                    // Sort by bitrate (kalo ada)
                    const bestMp3 = mp3Formats.sort((a, b) => {
                        const bitrateA = parseInt(a.q?.replace(/[^0-9]/g, '')) || 0
                        const bitrateB = parseInt(b.q?.replace(/[^0-9]/g, '')) || 0
                        return bitrateB - bitrateA
                    })[0]
                    result = bestMp3?.k
                    console.log('🎵 MP3 SELECTED:', bestMp3?.q)
                }
            }
        } else {
            // VIDEO - ambil format sesuai request
            if (!searchJson.links?.video) throw Error(`❌ Format video gak tersedia`)
            
            const videoFormats = Object.entries(searchJson.links.video)
            console.log('🎬 VIDEO FORMATS:', videoFormats.map(v => v[1].q))
            
            // Cari format yang diminta
            let selectedVideo = videoFormats.find(v => v[1].q === userFormat)
            
            // Kalo gak ada, ambil yang paling mendekati
            if (!selectedVideo) {
                const availableQualities = videoFormats
                    .map(v => v[1].q)
                    .filter(q => q && /\d+p/.test(q))
                    .map(q => parseInt(q))
                    .sort((a, b) => b - a)
                
                const requestedQuality = parseInt(userFormat)
                const closestQuality = availableQualities.find(q => q <= requestedQuality) || availableQualities[0]
                
                userFormat = closestQuality + 'p'
                selectedVideo = videoFormats.find(v => v[1].q === userFormat)
                console.log(`⚠️ FALLBACK KE: ${userFormat}`)
            }
            
            if (!selectedVideo) throw Error(`❌ Gak ada format video yang cocok`)
            result = selectedVideo[1]?.k
        }
        
        if (!result) throw Error(`❌ ${userFormat} gak ketemu`)
        return result
    },

    hit: async function (path, payload, retryCount = 0) {
        try {
            // Pastikan cookie ada
            if (!this.cookieJar && retryCount < 2) {
                await this.refreshCookie()
            }
            
            const body = new URLSearchParams({
                ...payload,
                cf_token: this.cfToken || ''
            })
            
            const opts = { 
                headers: this.baseHeaders, 
                body, 
                method: 'POST'
            }
            
            console.log(`📡 HIT ${path} [Attempt ${retryCount + 1}]`)
            
            const r = await fetch(`${this.baseUrl.origin}${path}`, opts)
            const text = await r.text()
            
            // Parse JSON
            let j
            try {
                j = JSON.parse(text)
            } catch (e) {
                console.log('❌ GAGAL PARSE JSON:', text.substring(0, 200))
                throw Error('Invalid JSON response')
            }
            
            // Handle cookie_required
            if (j.status === 'cookie_required' && retryCount < 3) {
                console.log('🍪 COOKIE REQUIRED! Refresh cookie...')
                await this.refreshCookie()
                // Coba lagi dengan cookie baru
                return this.hit(path, payload, retryCount + 1)
            }
            
            console.log(`✅ HIT SUCCESS:`, path)
            return j
            
        } catch (e) {
            if (retryCount < 3) {
                console.log(`🔄 RETRY ${retryCount + 1}: ${e.message}`)
                await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)))
                return this.hit(path, payload, retryCount + 1)
            }
            throw Error(`${path} failed: ${e.message}`)
        }
    },

    download: async function (queryOrYtUrl, userFormat = 'mp3') {
        // Refresh cookie dulu sebelum mulai
        await this.refreshCookie()
        
        // First hit - search
        let search = await this.hit('/api/ajax/search', {
            "query": queryOrYtUrl,
            "vt": "youtube"
        })

        console.log('🔍 SEARCH RESPONSE:', JSON.stringify(search, null, 2))

        // Handle search results
        if (search.p == 'search') {
            if (!search?.items?.length) throw Error(`❌ Hasil pencarian ${queryOrYtUrl} kosong`)
            
            const { v, t } = search.items[0]
            const videoUrl = 'https://www.youtube.com/watch?v=' + v
            console.log(`✅ FOUND: ${t}`)

            // Search lagi pake URL video
            search = await this.hit('/api/ajax/search', {
                "query": videoUrl,
                "vt": "youtube"
            })
        }

        // Validasi
        if (!search.vid) throw Error(`❌ Video ID gak ketemu: ${JSON.stringify(search)}`)
        if (!search.links) throw Error(`❌ Links gak tersedia`)

        const vid = search.vid
        const k = this.handleFormat(userFormat, search)

        // Convert
        console.log('🔄 MULAI CONVERT...')
        const convert = await this.hit('/api/ajax/convert', {
            k, vid
        })

        if (convert.c_status == 'CONVERTING') {
            let convert2
            const limit = 15
            let attempt = 0
            
            do {
                attempt++
                console.log(`⏳ CEK CONVERT ${attempt}/${limit}`)
                
                convert2 = await this.hit('/api/convert/check?hl=en', {
                    vid,
                    b_id: convert.b_id
                })
                
                if (convert2.c_status == 'CONVERTED') {
                    console.log('✅ CONVERTED!')
                    return convert2
                }
                
                if (convert2.c_status == 'ERROR') {
                    throw Error(`❌ Convert error: ${convert2.message || 'Unknown'}`)
                }
                
                await new Promise(re => setTimeout(re, 3000))
            } while (attempt < limit)
            
            throw Error('❌ Convert timeout')
        } else if (convert.c_status == 'ERROR') {
            throw Error(`❌ Convert error: ${convert.message}`)
        } else {
            return convert
        }
    }
}

module.exports = [
    {
        name: "Ytmp4",
        desc: "Download video youtube",
        category: "Downloader",
        path: "/download/ytmp4?apikey=&url=",
        async run(req, res) {
            try {
                const { apikey, url, format = '360p' } = req.query
                
                if (!apikey || !global.apikey?.includes(apikey))
                    return res.json({ 
                        creator: "IKY RESTAPI",
                        status: false, 
                        error: "Apikey invalid" 
                    })
                    
                if (!url)
                    return res.json({ 
                        creator: "IKY RESTAPI",
                        status: false, 
                        error: "Url is required" 
                    })

                // Validasi URL
                const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/
                if (!ytRegex.test(url)) {
                    return res.json({
                        creator: "IKY RESTAPI",
                        status: false,
                        error: "Invalid YouTube URL"
                    })
                }

                const results = await yt.download(url, format)
                
                res.json({
                    creator: "IKY RESTAPI",
                    status: true,
                    result: results.dlink,
                    title: results.title || "Unknown",
                    duration: results.duration || "Unknown",
                    format: format
                })
                
            } catch (error) {
                console.error(`💥 YTMP4 ERROR:`, error)
                res.json({ 
                    creator: "IKY RESTAPI",
                    status: false, 
                    error: error.message 
                })
            }
        }
    },

    {
        name: "Ytmp3",
        desc: "Download audio youtube",
        category: "Downloader",
        path: "/download/ytmp3?apikey=&url=",
        async run(req, res) {
            try {
                const { apikey, url } = req.query
                
                if (!apikey || !global.apikey?.includes(apikey))
                    return res.json({ 
                        creator: "IKY RESTAPI",
                        status: false, 
                        error: "Apikey invalid" 
                    })
                    
                if (!url)
                    return res.json({ 
                        creator: "IKY RESTAPI",
                        status: false, 
                        error: "Url is required" 
                    })

                // Validasi URL
                const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/
                if (!ytRegex.test(url)) {
                    return res.json({
                        creator: "IKY RESTAPI",
                        status: false,
                        error: "Invalid YouTube URL"
                    })
                }

                const results = await yt.download(url, "mp3")
                
                res.json({
                    creator: "IKY RESTAPI",
                    status: true,
                    result: results.dlink,
                    title: results.title || "Unknown",
                    duration: results.duration || "Unknown"
                })
                
            } catch (error) {
                console.error(`💥 YTMP3 ERROR:`, error)
                res.json({ 
                    creator: "IKY RESTAPI",
                    status: false, 
                    error: error.message 
                })
            }
        }
    }
]