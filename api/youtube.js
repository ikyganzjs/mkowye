const fetch = require("node-fetch");

const yt = {
    // BASE URL BARU - GA PAKE COOKIE!
    get baseUrl() {
        return {
            origin: 'https://id.savefrom.net'
        }
    },

    get baseHeaders() {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': this.baseUrl.origin,
            'Referer': this.baseUrl.origin + '/id/',
            'X-Requested-With': 'XMLHttpRequest'
        }
    },

    validateFormat(format) {
        const validFormats = ['mp3', '144p', '240p', '360p', '480p', '720p', '1080p'];
        if (!validFormats.includes(format)) {
            throw new Error(`Format ${format} gak valid! Pilih: ${validFormats.join(', ')}`);
        }
    },

    // Fungsi utama download
    async download(url, format = 'mp3') {
        try {
            this.validateFormat(format);
            
            console.log('🔄 MULAI DOWNLOAD:', url, 'FORMAT:', format);
            
            // Step 1: Extract video info
            const extractPayload = new URLSearchParams({
                'sf_url': url,
                'sf_submit': '',
                'new': '2',
                'lang': 'id',
                'country': 'ID'
            });
            
            console.log('📡 EXTRACT INFO...');
            const extractRes = await fetch('https://id.savefrom.net/convert/', {
                method: 'POST',
                headers: this.baseHeaders,
                body: extractPayload
            });
            
            const extractText = await extractRes.text();
            
            // Parse JSON dari response
            let videoData;
            try {
                // Response biasanya ada di dalem <textarea> atau JSONP
                const jsonMatch = extractText.match(/<textarea[^>]*>(.*?)<\/textarea>/s) || 
                                 extractText.match(/\(({.*})\)/s);
                
                if (jsonMatch) {
                    videoData = JSON.parse(jsonMatch[1].trim());
                } else {
                    // Coba parse langsung
                    videoData = JSON.parse(extractText);
                }
            } catch (e) {
                console.log('❌ GAGAL PARSE:', extractText.substring(0, 500));
                throw new Error('Gagal extract video info');
            }
            
            console.log('✅ VIDEO FOUND:', videoData.title || 'Unknown');
            
            // Step 2: Get download links
            const links = videoData.links || videoData.url || [];
            
            if (format === 'mp3') {
                // Cari link audio
                const audio = this.findFormat(links, 'mp3') || 
                             this.findFormat(links, 'audio') ||
                             this.findQuality(links, 'mp3');
                
                if (audio && audio.url) {
                    return {
                        title: videoData.title || 'Unknown',
                        duration: videoData.duration || 'Unknown',
                        dlink: audio.url,
                        format: 'mp3'
                    };
                }
                throw new Error('Link MP3 gak ketemu');
            } else {
                // Cari link video sesuai kualitas
                const quality = parseInt(format);
                const video = this.findQuality(links, quality);
                
                if (video && video.url) {
                    return {
                        title: videoData.title || 'Unknown',
                        duration: videoData.duration || 'Unknown',
                        dlink: video.url,
                        format: format,
                        quality: video.quality || format
                    };
                }
                throw new Error(`Link video ${format} gak ketemu`);
            }
            
        } catch (error) {
            console.error('💥 ERROR:', error);
            throw error;
        }
    },

    // Helper buat nyari format tertentu
    findFormat(links, type) {
        if (!links) return null;
        
        // Convert ke array kalo object
        const linksArray = Array.isArray(links) ? links : Object.values(links);
        
        return linksArray.find(link => {
            const linkType = (link.type || link.extension || '').toLowerCase();
            return linkType.includes(type);
        });
    },

    // Helper buat nyari kualitas tertentu
    findQuality(links, quality) {
        if (!links) return null;
        
        const linksArray = Array.isArray(links) ? links : Object.values(links);
        
        // Filter yang punya kualitas
        const withQuality = linksArray.filter(l => l.quality || l.height);
        
        if (withQuality.length === 0) return null;
        
        // Sort by quality
        const sorted = withQuality.sort((a, b) => {
            const qA = parseInt(a.quality || a.height || 0);
            const qB = parseInt(b.quality || b.height || 0);
            return qB - qA;
        });
        
        // Cari yang paling mendekati quality yang diminta
        if (typeof quality === 'number') {
            return sorted.find(l => {
                const q = parseInt(l.quality || l.height || 0);
                return q <= quality;
            }) || sorted[0];
        }
        
        return sorted[0];
    }
};

// EXPORT MODULE
module.exports = [
    {
        name: "Ytmp4",
        desc: "Download video youtube",
        category: "Downloader",
        path: "/download/ytmp4",
        async run(req, res) {
            try {
                const { apikey, url, format = '360p' } = req.query;
                
                // Validasi apikey
                if (!apikey || !global.apikey || !global.apikey.includes(apikey)) {
                    return res.json({ 
                        creator: "IKY RESTAPI",
                        status: false, 
                        error: "Apikey invalid" 
                    });
                }
                
                // Validasi url
                if (!url) {
                    return res.json({ 
                        creator: "IKY RESTAPI",
                        status: false, 
                        error: "URL YouTube diperlukan" 
                    });
                }
                
                // Validasi format YouTube
                const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
                if (!ytRegex.test(url)) {
                    return res.json({
                        creator: "IKY RESTAPI",
                        status: false,
                        error: "URL YouTube tidak valid"
                    });
                }
                
                console.log('🎬 YTMP4 REQUEST:', { url, format });
                
                // Download
                const result = await yt.download(url, format);
                
                res.json({
                    creator: "IKY RESTAPI",
                    status: true,
                    result: result.dlink,
                    title: result.title,
                    duration: result.duration,
                    format: result.format,
                    quality: result.quality || format
                });
                
            } catch (error) {
                console.error('💥 YTMP4 ERROR:', error);
                res.json({ 
                    creator: "IKY RESTAPI",
                    status: false, 
                    error: error.message 
                });
            }
        }
    },
    
    {
        name: "Ytmp3",
        desc: "Download audio youtube",
        category: "Downloader",
        path: "/download/ytmp3",
        async run(req, res) {
            try {
                const { apikey, url } = req.query;
                
                // Validasi apikey
                if (!apikey || !global.apikey || !global.apikey.includes(apikey)) {
                    return res.json({ 
                        creator: "IKY RESTAPI",
                        status: false, 
                        error: "Apikey invalid" 
                    });
                }
                
                // Validasi url
                if (!url) {
                    return res.json({ 
                        creator: "IKY RESTAPI",
                        status: false, 
                        error: "URL YouTube diperlukan" 
                    });
                }
                
                // Validasi format YouTube
                const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
                if (!ytRegex.test(url)) {
                    return res.json({
                        creator: "IKY RESTAPI",
                        status: false,
                        error: "URL YouTube tidak valid"
                    });
                }
                
                console.log('🎵 YTMP3 REQUEST:', url);
                
                // Download mp3
                const result = await yt.download(url, 'mp3');
                
                res.json({
                    creator: "IKY RESTAPI",
                    status: true,
                    result: result.dlink,
                    title: result.title,
                    duration: result.duration,
                    format: 'mp3'
                });
                
            } catch (error) {
                console.error('💥 YTMP3 ERROR:', error);
                res.json({ 
                    creator: "IKY RESTAPI",
                    status: false, 
                    error: error.message 
                });
            }
        }
    }
];