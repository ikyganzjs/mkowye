const fetch = require("node-fetch");
const cheerio = require("cheerio");

const yt = {
    get baseUrl() {
        return {
            origin: 'https://ssvid.net'
        }
    },

    get baseHeaders() {
        return {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'origin': this.baseUrl.origin,
            'referer': this.baseUrl.origin + '/youtube-to-mp3',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    },

    validateFormat: function (userFormat) {
        const validFormat = ['mp3', '360p', '720p', '1080p', '144p', '240p', '480p']
        if (!validFormat.includes(userFormat)) throw Error(`Format ${userFormat} gak valid! Pilih: ${validFormat.join(', ')}`)
    },

    handleFormat: function (userFormat, searchJson) {
        this.validateFormat(userFormat)
        let result
        
        // Cek struktur JSON dulu bego!
        if (!searchJson.links) throw Error(`Struktur JSON gak sesuai: ${JSON.stringify(searchJson)}`)
        
        if (userFormat == 'mp3') {
            // Buat MP3
            if (searchJson.links?.mp3) {
                const mp3Formats = Object.values(searchJson.links.mp3)
                if (mp3Formats.length > 0) {
                    // Ambil kualitas terbaik buat MP3 (biasanya 128kbps)
                    result = mp3Formats[0]?.k
                }
            }
        } else {
            // Buat MP4
            if (!searchJson.links?.video) throw Error(`Format video gak tersedia`)
            
            const videoFormats = Object.entries(searchJson.links.video)
            if (videoFormats.length === 0) throw Error(`Gak ada format video`)
            
            // Filter format yang ada 'p' (kualitas video)
            const availableQualities = videoFormats
                .map(v => v[1].q)
                .filter(q => q && /\d+p/.test(q))
            
            if (availableQualities.length === 0) throw Error(`Gak ada format video dengan kualitas`)
            
            // Cek kualitas yang diminta ada atau tidak
            if (!availableQualities.includes(userFormat)) {
                // Fallback ke kualitas tertinggi
                const sortedQualities = availableQualities
                    .map(q => parseInt(q))
                    .filter(v => !isNaN(v))
                    .sort((a, b) => b - a)
                
                const bestQuality = sortedQualities[0] + 'p'
                console.log(`Format ${userFormat} gak ada. Pake ${bestQuality}`)
                userFormat = bestQuality
            }
            
            // Cari format yang sesuai
            const selectedFormat = videoFormats.find(v => v[1].q === userFormat)
            if (!selectedFormat) throw Error(`Format ${userFormat} gak ketemu`)
            
            result = selectedFormat[1]?.k
        }
        
        if (!result) throw Error(`${userFormat} gak tersedia. Coba format lain tai.`)
        return result
    },

    hit: async function (path, payload) {
        try {
            const body = new URLSearchParams(payload)
            const opts = { 
                headers: this.baseHeaders, 
                body, 
                method: 'POST'
            }
            
            const r = await fetch(`${this.baseUrl.origin}${path}`, opts)
            console.log(`Hit ${path} - Status: ${r.status}`)
            
            if (!r.ok) throw Error(`${r.status} ${r.statusText}`)
            
            const j = await r.json()
            return j
        } catch (e) {
            throw Error(`${path} failed: ${e.message}`)
        }
    },

    download: async function (queryOrYtUrl, userFormat = 'mp3') {
        this.validateFormat(userFormat)

        // First hit - search
        let search = await this.hit('/api/ajax/search', {
            "query": queryOrYtUrl,
            "cf_token": "",
            "vt": "youtube"
        })

        console.log(`Search response:`, JSON.stringify(search, null, 2))

        // Handle search results
        if (search.p == 'search') {
            if (!search?.items?.length) throw Error(`Hasil pencarian ${queryOrYtUrl} kosong`)
            
            const { v, t } = search.items[0]
            const videoUrl = 'https://www.youtube.com/watch?v=' + v
            console.log(`Found: ${t} - ${videoUrl}`)

            // Search lagi pake URL video
            search = await this.hit('/api/ajax/search', {
                "query": videoUrl,
                "cf_token": "",
                "vt": "youtube"
            })
        }

        // Validasi response
        if (!search.vid) throw Error(`Video ID gak ketemu: ${JSON.stringify(search)}`)
        if (!search.links) throw Error(`Links gak tersedia: ${JSON.stringify(search)}`)

        const vid = search.vid
        const k = this.handleFormat(userFormat, search)

        // Convert
        const convert = await this.hit('/api/ajax/convert', {
            k, vid
        })

        console.log(`Convert response:`, JSON.stringify(convert, null, 2))

        if (convert.c_status == 'CONVERTING') {
            let convert2
            const limit = 10
            let attempt = 0
            
            do {
                attempt++
                console.log(`Cek convert ${attempt}/${limit}`)
                
                convert2 = await this.hit('/api/convert/check?hl=en', {
                    vid,
                    b_id: convert.b_id
                })
                
                console.log(`Check response:`, JSON.stringify(convert2, null, 2))
                
                if (convert2.c_status == 'CONVERTED') {
                    return convert2
                }
                
                if (convert2.c_status == 'ERROR') {
                    throw Error(`Convert error: ${convert2.message || 'Unknown error'}`)
                }
                
                await new Promise(re => setTimeout(re, 3000))
            } while (attempt < limit && convert2?.c_status == 'CONVERTING')
            
            throw Error('Convert timeout atau status gak jelas')

        } else if (convert.c_status == 'ERROR') {
            throw Error(`Convert error: ${convert.message || 'Unknown error'}`)
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
                const { apikey, url } = req.query
                
                // Validasi
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

                // Validasi URL YouTube
                const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/
                if (!ytRegex.test(url)) {
                    return res.json({
                        creator: "IKY RESTAPI",
                        status: false,
                        error: "Invalid YouTube URL"
                    })
                }

                // Coba 360p dulu, kalo error fallback otomatis
                try {
                    const results = await yt.download(url, "360p")
                    return res.json({
                        creator: "IKY RESTAPI",
                        status: true,
                        result: results.dlink,
                        title: results.title || "Unknown",
                        duration: results.duration || "Unknown"
                    })
                } catch (err) {
                    // Fallback ke format lain
                    console.log(`360p error, coba 240p: ${err.message}`)
                    const results = await yt.download(url, "240p")
                    return res.json({
                        creator: "IKY RESTAPI",
                        status: true,
                        result: results.dlink,
                        title: results.title || "Unknown",
                        duration: results.duration || "Unknown"
                    })
                }
                
            } catch (error) {
                console.error(`YTMP4 Error:`, error)
                res.status(500).json({ 
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
                
                // Validasi
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

                // Validasi URL YouTube
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
                console.error(`YTMP3 Error:`, error)
                res.status(500).json({ 
                    creator: "IKY RESTAPI",
                    status: false, 
                    error: error.message 
                })
            }
        }
    }
]