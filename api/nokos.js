// ===============================================
// MODULE: REAL OTP GENERATOR
// STRUCTURE: Module Exports (Kayak contoh lu)
// CODING: IkyGPT - Converted Edition 💀🔥
// ===============================================

const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
    name: "OTP WhatsApp",
    desc: "OTP WhatsApp from free providers",
    category: "Tools",
    path: "/tools/otp?apikey=&number=",

    // Cache system
    cache: new Map(),
    cacheTimeout: 2 * 60 * 1000, // 2 menit

    // Class internal (diubah jadi method object)
    numbers: [],
    activeNumber: null,
    activeSession: null,

    // Helper: Bersihin cache
    cleanCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.cache.delete(key);
            }
        }
    },

    // Helper: Sleep
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Helper: Generate random IP
    generateRandomIP() {
        return Array(4).fill(0).map(() => Math.floor(Math.random() * 255)).join('.');
    },

    // FUNC 1: Scrape nomor gratis
    async getFreeNumber() {
        console.log('🔍 SCANNING PROVIDER GRATISAN...');
        this.numbers = [];
        
        // Provider 1: TEMP-NUMBER.COM
        try {
            console.log('📡 Provider 1: temp-number.com');
            
            const response = await axios.get('https://temp-number.com/', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'X-Forwarded-For': this.generateRandomIP()
                },
                timeout: 10000
            });

            const $ = cheerio.load(response.data);
            
            $('.number-box').each((i, el) => {
                const number = $(el).find('.number').text().trim();
                const country = $(el).find('.country').text().trim();
                
                if (number && country.includes('Indonesia')) {
                    this.numbers.push({
                        number: number.replace(/\D/g, ''),
                        country: 'Indonesia',
                        provider: 'temp-number'
                    });
                }
            });

            if (this.numbers.length > 0) {
                console.log(`✅ Ditemukan ${this.numbers.length} nomor Indonesia!`);
                return this.numbers;
            }

        } catch (error) {
            console.log('❌ Provider 1 error:', error.message);
        }

        // Provider 2: RECEIVE-SMS-ONLINE.CC
        try {
            console.log('📡 Provider 2: receive-sms-online.cc');
            
            const response = await axios.get('https://receive-sms-online.cc', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'X-Forwarded-For': this.generateRandomIP()
                },
                timeout: 10000
            });

            const $ = cheerio.load(response.data);
            
            $('table.numbers-table tr').each((i, row) => {
                if (i === 0) return;
                
                const cols = $(row).find('td');
                if (cols.length >= 3) {
                    const number = $(cols[1]).text().trim();
                    const country = $(cols[2]).text().trim();
                    
                    if (country.includes('Indonesia') || number.startsWith('62')) {
                        this.numbers.push({
                            number: number.replace(/\D/g, ''),
                            country: 'Indonesia',
                            provider: 'receive-sms-online'
                        });
                    }
                }
            });

        } catch (error) {
            console.log('❌ Provider 2 error:', error.message);
        }

        return this.numbers;
    },

    // FUNC 2: Cek OTP berdasarkan provider
    async checkOTP(number, provider) {
        console.log(`\n🔍 Checking OTP untuk ${number}...`);

        switch (provider) {
            case 'temp-number':
                return await this.checkTempNumber(number);
            case 'receive-sms-online':
                return await this.checkReceiveSMS(number);
            case 'sms24-api':
                return await this.checkSMS24API(number);
            default:
                return await this.genericCheck(number);
        }
    },

    // Check Temp Number
    async checkTempNumber(number) {
        try {
            const formattedNumber = number.slice(-10);
            
            const response = await axios.get(
                `https://temp-number.com/number/${formattedNumber}`,
                {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-Forwarded-For': this.generateRandomIP()
                    },
                    timeout: 5000
                }
            );

            const $ = cheerio.load(response.data);
            
            let result = { success: false };
            
            $('.sms-item').each((i, el) => {
                const text = $(el).text();
                const otpMatch = text.match(/\b\d{4,8}\b/);
                
                if (otpMatch && text.includes('WhatsApp')) {
                    result = {
                        success: true,
                        otp: otpMatch[0],
                        fullMessage: text,
                        time: $(el).find('.time').text()
                    };
                }
            });

            return result;

        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Check Receive SMS
    async checkReceiveSMS(number) {
        try {
            const response = await axios.get(
                `https://receive-sms-online.cc/sms/${number}`,
                { 
                    timeout: 5000,
                    headers: {
                        'X-Forwarded-For': this.generateRandomIP()
                    }
                }
            );

            const $ = cheerio.load(response.data);
            
            let result = { success: false };
            
            $('.sms-message').each((i, el) => {
                const text = $(el).text();
                const otpMatch = text.match(/\b\d{4,8}\b/);
                
                if (otpMatch && text.includes('WhatsApp')) {
                    result = {
                        success: true,
                        otp: otpMatch[0],
                        fullMessage: text,
                        time: $(el).find('.date').text()
                    };
                }
            });

            return result;

        } catch (error) {
            return { success: false };
        }
    },

    // Check SMS24 API
    async checkSMS24API(number) {
        try {
            const response = await axios.get(
                `https://api.sms24.me/receive/${number}`,
                { timeout: 5000 }
            );

            if (response.data?.messages?.length > 0) {
                const messages = response.data.messages;
                const waMessages = messages.filter(m => 
                    m.message.toLowerCase().includes('whatsapp') ||
                    m.message.toLowerCase().includes('wa')
                );

                if (waMessages.length > 0) {
                    const latest = waMessages[0];
                    const otpMatch = latest.message.match(/\b\d{4,8}\b/);

                    if (otpMatch) {
                        return {
                            success: true,
                            otp: otpMatch[0],
                            fullMessage: latest.message,
                            sender: latest.sender,
                            time: latest.received_at
                        };
                    }
                }
            }
            return { success: false };

        } catch (error) {
            return { success: false };
        }
    },

    // Generic Check
    async genericCheck(number) {
        const checkUrls = [
            `https://smsreceivefree.com/sms/${number}`,
            `https://freesmsverification.com/receive-sms/${number}`
        ];

        for (const url of checkUrls) {
            try {
                const response = await axios.get(url, { 
                    timeout: 5000,
                    headers: {
                        'X-Forwarded-For': this.generateRandomIP()
                    }
                });
                const $ = cheerio.load(response.data);
                
                const text = $('body').text();
                const otpMatch = text.match(/\b\d{4,8}\b/);
                
                if (otpMatch && text.includes('WhatsApp')) {
                    return {
                        success: true,
                        otp: otpMatch[0],
                        fullMessage: text.substring(0, 200),
                        source: url
                    };
                }

            } catch (error) {
                continue;
            }
        }

        return { success: false };
    },

    // FUNC 3: Wait for OTP with retry
    async waitForOTP(number, provider, maxAttempts = 20) {
        console.log(`\n⏳ Menunggu OTP untuk ${number}...`);
        console.log(`🔄 Cek setiap 5 detik`);
        console.log(`⚠️ Maksimal ${maxAttempts} kali percobaan\n`);

        for (let i = 0; i < maxAttempts; i++) {
            console.log(`[Attempt ${i+1}/${maxAttempts}] Checking...`);
            
            const result = await this.checkOTP(number, provider);
            
            if (result.success) {
                console.log('\n✅ OTP DITEMUKAN!');
                return result;
            }
            
            console.log(`⏰ Belum ada OTP, cek lagi dalam 5 detik...\n`);
            await this.sleep(5000);
        }
        
        return { success: false, message: 'Timeout, OTP tidak masuk' };
    },

    // FUNC 4: Dapatkan nomor dari parameter
    async getNumberFromParam(param) {
        // Kalo param berupa indeks (1,2,3)
        if (!isNaN(param) && this.numbers[parseInt(param)-1]) {
            return this.numbers[parseInt(param)-1];
        }
        
        // Kalo param berupa nomor langsung
        if (param && param.length >= 10) {
            const cleanNumber = param.replace(/\D/g, '');
            return {
                number: cleanNumber,
                provider: 'custom',
                country: 'Indonesia'
            };
        }
        
        return null;
    },

    // MAIN FUNCTION
    async run(req, res) {
        try {
            // 1. Ambil parameter
            const { apikey, number, provider } = req.query;
            
            // 2. Validasi apikey
            if (!apikey || !global.apikey.includes(apikey)) {
                return res.status(403).json({ 
                    status: false, 
                    error: 'Apikey invalid',
                    code: 'AUTH_FAILED'
                });
            }

            // 3. Cek cache
            const cacheKey = `otp_${number || 'list'}`;
            const cachedData = this.cache.get(cacheKey);
            
            if (cachedData && (Date.now() - cachedData.timestamp) < this.cacheTimeout) {
                console.log(`🎯 Cache hit for ${cacheKey}`);
                return res.json({
                    status: true,
                    cached: true,
                    data: cachedData.data
                });
            }

            // 4. Kalo nggak ada parameter number, tampilkan daftar nomor
            if (!number) {
                await this.getFreeNumber();
                
                if (this.numbers.length === 0) {
                    return res.status(404).json({
                        status: false,
                        error: 'Tidak ada nomor gratis tersedia',
                        suggestion: 'Coba lagi nanti atau pake provider berbayar'
                    });
                }

                const response = {
                    status: true,
                    total: this.numbers.length,
                    numbers: this.numbers.map((n, i) => ({
                        index: i + 1,
                        number: n.number,
                        provider: n.provider
                    })),
                    instructions: 'Gunakan parameter ?number=[index] atau ?number=[nomor] untuk cek OTP'
                };

                // Simpan ke cache
                this.cache.set(cacheKey, {
                    data: response,
                    timestamp: Date.now()
                });

                return res.json(response);
            }

            // 5. Kalo ada parameter number, cek OTP
            const selectedNumber = await this.getNumberFromParam(number);
            
            if (!selectedNumber) {
                return res.status(400).json({
                    status: false,
                    error: 'Nomor tidak valid',
                    available: this.numbers.map(n => n.number)
                });
            }

            // 6. Tunggu OTP
            const otpResult = await this.waitForOTP(
                selectedNumber.number,
                provider || selectedNumber.provider
            );

            // 7. Return result
            if (otpResult.success) {
                // Simpan ke cache
                this.cache.set(`otp_result_${selectedNumber.number}`, {
                    data: otpResult,
                    timestamp: Date.now()
                });

                return res.json({
                    status: true,
                    message: 'OTP berhasil didapatkan',
                    data: {
                        number: selectedNumber.number,
                        otp: otpResult.otp,
                        full_message: otpResult.fullMessage,
                        time: otpResult.time || new Date().toISOString(),
                        provider: selectedNumber.provider
                    }
                });
            } else {
                return res.status(404).json({
                    status: false,
                    error: 'OTP tidak ditemukan',
                    message: otpResult.message || 'Timeout atau belum ada SMS',
                    suggestion: 'Coba nomor lain atau tunggu beberapa saat'
                });
            }

        } catch (error) {
            console.error('🔥 ERROR:', error);
            
            res.status(500).json({
                status: false,
                error: `Internal server error: ${error.message}`,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
};