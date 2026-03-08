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
            'referer': this.baseUrl.origin + '/youtube-to-mp3'
        }
    },

    validateFormat: function (userFormat) {
        const validFormat = ['mp3', '360', '360p', '720', '720p', '1080', '1080p']
        if (!validFormat.includes(userFormat)) throw Error(`invalid format!. available formats: ${validFormat.join(', ')}`)
    },

    handleFormat: function (userFormat, searchJson) {
        this.validateFormat(userFormat)
        let result
        
        // Normalisasi format (hapus 'p' jika ada)
        const cleanFormat = userFormat.replace('p', '')
        
        if (userFormat == 'mp3') {
            // Untuk MP3
            if (searchJson.links?.mp3) {
                // Cari format MP3 dengan kualitas terbaik
                const mp3Formats = Object.values(searchJson.links.mp3)
                if (mp3Formats.length > 0) {
                    // Ambil yang pertama (biasanya kualitas terbaik)
                    result = mp3Formats[0]?.k
                }
            }
        } else {
            // Untuk Video
            if (searchJson.links?.mp4) {
                const mp4Formats = Object.values(searchJson.links.mp4)
                // Cari format dengan kualitas yang diminta
                const selected = mp4Formats.find(v => {
                    const quality = String(v.q || '').replace('p', '')
                    return quality === cleanFormat
                })
                
                if (selected) {
                    result = selected.k
                } else {
                    // Jika tidak ditemukan, ambil kualitas terbaik
                    const bestQuality = mp4Formats.sort((a, b) => {
                        const qA = parseInt(String(a.q || '0').replace('p', '')) || 0
                        const qB = parseInt(String(b.q || '0').replace('p', '')) || 0
                        return qB - qA
                    })[0]
                    result = bestQuality?.k
                    console.log(`format ${userFormat} tidak ada. menggunakan ${bestQuality?.q || 'unknown'}`)
                }
            }
        }
        
        if (!result) throw Error(`${userFormat} tidak tersedia untuk video ini`)
        return result
    },

    hit: async function (path, payload) {
        try {
            const body = new URLSearchParams(payload)
            const opts = { 
                headers: this.baseHeaders, 
                body, 
                method: 'post' 
            }
            const r = await fetch(`${this.baseUrl.origin}${path}`, opts)
            
            if (!r.ok) throw Error(`${r.status} ${r.statusText}`)
            
            const j = await r.json()
            return j
        } catch (e) {
            throw Error(`${path}\n${e.message}`)
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

        // Jika hasil berupa daftar pencarian, ambil video pertama
        if (search.p === 'search' || search.p === 'list') {
            if (!search?.items?.length) throw Error(`Hasil pencarian ${queryOrYtUrl} tidak ditemukan`)
            
            const { v, t } = search.items[0]
            const videoUrl = 'https://www.youtube.com/watch?v=' + v
            console.log(`[Found]\nTitle: ${t}\nURL: ${videoUrl}`)

            // Hit lagi dengan URL video
            search = await this.hit('/api/ajax/search', {
                "query": videoUrl,
                "cf_token": "",
                "vt": "youtube"
            })
        }

        // Validasi response
        if (!search || !search.vid) {
            throw Error('Gagal mendapatkan informasi video')
        }

        const vid = search.vid
        const k = this.handleFormat(userFormat, search)

        // Second hit - convert
        const convert = await this.hit('/api/ajax/convert', {
            k, 
            vid
        })

        // Handle converting status
        if (convert.c_status === 'CONVERTING' || convert.c_status === 'IN_QUEUE') {
            let convertResult
            const maxAttempts = 10
            let attempt = 0
            
            do {
                attempt++
                console.log(`Checking conversion ${attempt}/${maxAttempts}`)
                
                // Tunggu 3 detik sebelum cek
                await new Promise(resolve => setTimeout(resolve, 3000))
                
                // Check status
                convertResult = await this.hit('/api/convert/check?hl=en', {
                    vid,
                    b_id: convert.b_id
                })
                
                if (convertResult.c_status === 'CONVERTED') {
                    return convertResult
                }
                
            } while (attempt < maxAttempts && 
                    (convertResult?.c_status === 'CONVERTING' || 
                     convertResult?.c_status === 'IN_QUEUE'))
            
            throw Error('Waktu konversi habis, silakan coba lagi')
        } else if (convert.c_status === 'CONVERTED') {
            return convert
        } else {
            throw Error(`Status tidak diketahui: ${convert.c_status}`)
        }
    },
}

module.exports = [
  {
    name: "Ytmp4",
    desc: "Download video youtube",
    category: "Downloader",
    path: "/download/ytmp4?apikey=&url=",
    async run(req, res) {
      try {
        const { apikey, url } = req.query;
        if (!apikey || !global.apikey.includes(apikey))
          return res.json({ 
            creator: "IKY RESTAPI",
            status: false, 
            error: "Apikey invalid" 
          });
          
        if (!url)
          return res.json({ 
            creator: "IKY RESTAPI",
            status: false, 
            error: "Url is required" 
          });

        // Coba dengan format 360p, fallback ke kualitas terbaik jika tidak ada
        const results = await yt.download(url, "360p")
        
        res.status(200).json({
          creator: "IKY RESTAPI",
          status: true,
          result: {
            title: results.title || results.meta?.title || 'Unknown',
            duration: results.timer?.replace('00:', '') || results.meta?.duration || 'Unknown',
            quality: results.meta?.q || '360p',
            dlink: results.dlink || results.url
          }
        });
      } catch (error) {
        console.error('Ytmp4 Error:', error);
        res.status(500).json({ 
          creator: "IKY RESTAPI",
          status: false, 
          error: error.message 
        });
      }
    },
  },

  {
    name: "Ytmp3",
    desc: "Download audio youtube",
    category: "Downloader",
    path: "/download/ytmp3?apikey=&url=",
    async run(req, res) {
      try {
        const { apikey, url } = req.query;
        if (!apikey || !global.apikey.includes(apikey))
          return res.json({ 
            creator: "IKY RESTAPI",
            status: false, 
            error: "Apikey invalid" 
          });
          
        if (!url)
          return res.json({ 
            creator: "IKY RESTAPI",
            status: false, 
            error: "Url is required" 
          });

        const results = await yt.download(url, "mp3")
        
        res.status(200).json({
          creator: "IKY RESTAPI",
          status: true,
          result: {
            title: results.title || results.meta?.title || 'Unknown',
            duration: results.timer?.replace('00:', '') || results.meta?.duration || 'Unknown',
            quality: 'MP3',
            dlink: results.dlink || results.url
          }
        });
      } catch (error) {
        console.error('Ytmp3 Error:', error);
        res.status(500).json({ 
          creator: "IKY RESTAPI",
          status: false, 
          error: error.message 
        });
      }
    },
  }
];