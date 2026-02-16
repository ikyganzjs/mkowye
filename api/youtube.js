const fetch = require("node-fetch");
const cheerio = require("cheerio");

const yt = {
    // BASE URL SAVEFROM.NET
    get baseUrl() {
        return {
            origin: 'https://id.savefrom.net'
        }
    },

    // HEADERS LENGKAP KAYA MANUSIA
    get baseHeaders() {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': this.baseUrl.origin,
            'Referer': this.baseUrl.origin + '/',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        }
    },

    // VALIDASI FORMAT
    validateFormat: function(format) {
        const validFormats = ['mp3', '144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '2160p'];
        if (!validFormats.includes(format)) {
            throw new Error(`Format ${format} gak valid! Pilih: ${validFormats.join(', ')}`);
        }
    },

    // EKSTRAK LINK DARI HTML (CARA BARU!)
    extractLinks: function(html, requestedFormat) {
        const $ = cheerio.load(html);
        const links = [];
        const result = {
            title: '',
            duration: '',
            links: []
        };

        // Ambil judul video
        result.title = $('.info-box h2').text().trim() || 
                       $('.video-title').text().trim() || 
                       $('h2.title').text().trim() || 
                       'Unknown Title';

        // Ambil durasi
        result.duration = $('.duration').text().trim() || 
                          $('.info-box .duration').text().trim() || 
                          'Unknown';

        console.log('📹 Video:', result.title);
        console.log('⏱️ Durasi:', result.duration);

        // Cari semua link download
        $('.link-box a, .download-link a, .dl-link, a[href*="go.php"], .link-download a').each((i, el) => {
            const link = $(el).attr('href');
            const text = $(el).text().toLowerCase();
            const parentText = $(el).parent().text().toLowerCase();
            const htmlContent = $(el).html()?.toLowerCase() || '';
            
            if (link && link.includes('http')) {
                let quality = '360p';
                let type = 'video';
                
                // Deteksi kualitas
                if (text.includes('1080') || parentText.includes('1080') || htmlContent.includes('1080')) quality = '1080p';
                else if (text.includes('720') || parentText.includes('720') || htmlContent.includes('720')) quality = '720p';
                else if (text.includes('480') || parentText.includes('480') || htmlContent.includes('480')) quality = '480p';
                else if (text.includes('360') || parentText.includes('360') || htmlContent.includes('360')) quality = '360p';
                else if (text.includes('240') || parentText.includes('240') || htmlContent.includes('240')) quality = '240p';
                else if (text.includes('144') || parentText.includes('144') || htmlContent.includes('144')) quality = '144p';
                
                // Deteksi tipe (audio/video)
                if (text.includes('mp3') || parentText.includes('mp3') || htmlContent.includes('mp3') || 
                    text.includes('audio') || parentText.includes('audio')) {
                    type = 'mp3';
                    quality = 'mp3';
                } else {
                    // Deteksi format dari URL
                    if (link.includes('.mp3') || link.includes('audio')) type = 'mp3';
                }
                
                links.push({
                    url: link,
                    quality: quality,
                    type: type,
                    text: $(el).text().trim()
                });
            }
        });

        // Kalo pake savefrom.net, kadang linknya di dalem script
        if (links.length === 0) {
            // Cari di script tags
            $('script').each((i, el) => {
                const script = $(el).html() || '';
                const match = script.match(/"(https?:\/\/[^"]+\.(?:mp4|mp3)[^"]*)"/);
                if (match) {
                    links.push({
                        url: match[1],
                        quality: requestedFormat,
                        type: requestedFormat === 'mp3' ? 'mp3' : 'video'
                    });
                }
            });
        }

        result.links = links;
        console.log(`🔗 Ditemukan ${links.length} link download`);
        
        return result;
    },

    // FUNGSI DOWNLOAD UTAMA
    download: async function(url, format = 'mp3') {
        try {
            this.validateFormat(format);
            
            console.log('🚀 MULAI DOWNLOAD:', url);
            console.log('🎯 FORMAT:', format);

            // STEP 1: Submit URL ke savefrom.net
            const formData = new URLSearchParams();
            formData.append('sf_url', url);
            formData.append('sf_submit', '');
            formData.append('new', '2');
            formData.append('lang', 'id');
            formData.append('country', 'ID');

            console.log('📤 Submit URL...');
            
            const submitRes = await fetch('https://id.savefrom.net/convert/', {
                method: 'POST',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Origin': 'https://id.savefrom.net',
                    'Referer': 'https://id.savefrom.net/',
                    'Connection': 'keep-alive'
                },
                body: formData
            });

            const html = await submitRes.text();
            
            // Cek kalo error
            if (html.includes('404') || html.includes('tidak ditemukan')) {
                throw new Error('Video tidak ditemukan atau URL salah');
            }

            // STEP 2: Extract links dari HTML
            const videoInfo = this.extractLinks(html, format);

            if (videoInfo.links.length === 0) {
                throw new Error('Tidak ada link download ditemukan');
            }

            // STEP 3: Filter link sesuai format yang diminta
            let downloadLink = null;

            if (format === 'mp3') {
                // Cari link audio
                downloadLink = videoInfo.links.find(l => l.type === 'mp3' || l.url.includes('.mp3'));
                
                // Kalo gak ada, ambil link video dengan kualitas terendah (biasanya bisa jadi mp3)
                if (!downloadLink) {
                    const videoLinks = videoInfo.links.filter(l => l.type !== 'mp3');
                    if (videoLinks.length > 0) {
                        // Sort by quality (lowest first for mp3)
                        const sorted = videoLinks.sort((a, b) => {
                            const qA = parseInt(a.quality) || 9999;
                            const qB = parseInt(b.quality) || 9999;
                            return qA - qB;
                        });
                        downloadLink = sorted[0];
                    }
                }
            } else {
                // Cari link video dengan kualitas sesuai
                const qualityNum = parseInt(format);
                
                // Filter link video
                const videoLinks = videoInfo.links.filter(l => l.type !== 'mp3' && l.quality !== 'mp3');
                
                if (videoLinks.length > 0) {
                    // Cari yang paling mendekati kualitas yang diminta
                    const sorted = videoLinks.sort((a, b) => {
                        const qA = parseInt(a.quality) || 0;
                        const qB = parseInt(b.quality) || 0;
                        return qB - qA;
                    });
                    
                    // Cari kualitas <= yang diminta
                    downloadLink = sorted.find(l => {
                        const q = parseInt(l.quality) || 0;
                        return q <= qualityNum;
                    });
                    
                    // Kalo gak ada, ambil yang terendah
                    if (!downloadLink) {
                        downloadLink = sorted[sorted.length - 1];
                    }
                }
            }

            // Kalo masih gak dapet, ambil link pertama
            if (!downloadLink && videoInfo.links.length > 0) {
                downloadLink = videoInfo.links[0];
            }

            if (!downloadLink) {
                throw new Error(`Gagal mendapatkan link download untuk format ${format}`);
            }

            console.log('✅ LINK DIDAPATKAN:', downloadLink.url);
            console.log('📊 KUALITAS:', downloadLink.quality);

            // STEP 4: Follow redirect jika perlu (beberapa link perlu di-follow)
            let finalUrl = downloadLink.url;
            
            // Kalo linknya pendek (kemungkinan redirect)
            if (finalUrl.includes('go.php') || finalUrl.includes('redirect') || !finalUrl.includes('http')) {
                try {
                    const redirectRes = await fetch(finalUrl, {
                        method: 'HEAD',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        },
                        redirect: 'manual'
                    });
                    
                    if (redirectRes.headers.get('location')) {
                        finalUrl = redirectRes.headers.get('location');
                    }
                } catch (e) {
                    console.log('Redirect error, pake link asli');
                }
            }

            return {
                title: videoInfo.title,
                duration: videoInfo.duration,
                dlink: finalUrl,
                format: format,
                quality: downloadLink.quality || format,
                allLinks: videoInfo.links // Optional, kalo mau liat semua link
            };

        } catch (error) {
            console.error('💥 ERROR DOWNLOAD:', error);
            throw error;
        }
    }
};

// EXPORT MODULE
module.exports = [
    {
        name: "Ytmp4",
        desc: "Download video YouTube",
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
                
                // Download video
                const result = await yt.download(url, format);
                
                res.json({
                    creator: "IKY RESTAPI",
                    status: true,
                    result: result.dlink,
                    title: result.title,
                    duration: result.duration,
                    format: result.format,
                    quality: result.quality
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
        desc: "Download audio YouTube",
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
                
                // Download audio
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