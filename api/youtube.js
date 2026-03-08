const fetch = require("node-fetch");

const yt = {
    get baseUrl() {
        return {
            origin: 'https://ssvid.net'
        }
    },

    get baseHeaders() {
        return {
            'accept': '*/*',
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'origin': this.baseUrl.origin,
            'referer': this.baseUrl.origin + '/youtube-to-mp3',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'x-requested-with': 'XMLHttpRequest'
        }
    },

    // Simple request tanpa CF handling yang ribet
    hit: async function (path, payload) {
        try {
            const body = new URLSearchParams(payload);
            const response = await fetch(`${this.baseUrl.origin}${path}`, {
                method: 'POST',
                headers: this.baseHeaders,
                body: body,
                timeout: 8000 // timeout 8 detik
            });

            if (!response.ok) throw Error(`HTTP ${response.status}`);
            
            return await response.json();
        } catch (e) {
            throw Error(e.message);
        }
    },

    download: async function (url, format = 'mp3') {
        // Langsung panggil API tanpa delay
        const search = await this.hit('/api/ajax/search', {
            "query": url,
            "vt": "youtube"
        });

        if (!search?.vid) throw Error('Video tidak ditemukan');

        // Dapatkan k link
        let k;
        if (format === 'mp3') {
            k = search.links?.mp3?.[Object.keys(search.links.mp3)[0]]?.k;
        } else {
            const mp4 = Object.values(search.links?.mp4 || {});
            k = mp4[0]?.k; // ambil kualitas pertama aja biar cepat
        }

        if (!k) throw Error('Format tidak tersedia');

        // Convert
        const convert = await this.hit('/api/ajax/convert', {
            k: k,
            vid: search.vid
        });

        // Langsung return tanpa nunggu convert selesai
        return {
            dlink: `https://files1.ssvid.net/download?id=${search.vid}&token=${convert.b_id}`,
            title: search.title || 'Unknown'
        };
    }
};

module.exports = [
    {
        name: "Ytmp4",
        path: "/download/ytmp4",
        async run(req, res) {
            try {
                const { url } = req.query;
                
                if (!url) {
                    return res.status(400).json({
                        creator: "IKY RESTAPI",
                        status: false,
                        error: "URL required"
                    });
                }

                // Set timeout lebih pendek
                const downloadPromise = yt.download(url, '360p');
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Timeout')), 9000);
                });

                const result = await Promise.race([downloadPromise, timeoutPromise]);

                res.json({
                    creator: "IKY RESTAPI",
                    status: true,
                    result: {
                        title: result.title,
                        dlink: result.dlink
                    }
                });

            } catch (error) {
                res.status(500).json({
                    creator: "IKY RESTAPI",
                    status: false,
                    error: error.message
                });
            }
        }
    },
    {
        name: "Ytmp3",
        path: "/download/ytmp3",
        async run(req, res) {
            try {
                const { url } = req.query;
                
                if (!url) {
                    return res.status(400).json({
                        creator: "IKY RESTAPI",
                        status: false,
                        error: "URL required"
                    });
                }

                const downloadPromise = yt.download(url, 'mp3');
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Timeout')), 9000);
                });

                const result = await Promise.race([downloadPromise, timeoutPromise]);

                res.json({
                    creator: "IKY RESTAPI",
                    status: true,
                    result: {
                        title: result.title,
                        dlink: result.dlink
                    }
                });

            } catch (error) {
                res.status(500).json({
                    creator: "IKY RESTAPI",
                    status: false,
                    error: error.message
                });
            }
        }
    }
];