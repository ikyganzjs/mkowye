const otpStore = new Map();
const emailCooldown = new Map();

// 5 akun email dengan app password
const emailAccounts = [
    { email: 'ikyotp1@gmail.com', password: 'aany qdwr yfic daem' },
    { email: 'ikyotp2@gmail.com', password: 'bcsk keys chae xghf' },
    { email: 'ikyotp3@gmail.com', password: 'oifp eugy uerl rifs' },
    { email: 'ikyotp4@gmail.com', password: 'xpgi dhtg ysfo gauz' },
    { email: 'ikyotp5@gmail.com', password: 'jept itnh fsdk mxht' }
];

// Tracker untuk load balancing
const emailDailyCounter = new Map();

// Inisialisasi counter untuk semua akun
emailAccounts.forEach(account => {
    emailDailyCounter.set(account.email, {
        count: 0,
        lastReset: Date.now(),
        lastUsed: 0
    });
});

// Fungsi untuk memilih email dengan load balancing
function getBalancedEmailAccount() {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const MAX_DAILY_EMAILS = 450; // Batas aman di bawah 500
    
    // Reset counter harian yang sudah lewat 24 jam
    for (const [email, counter] of emailDailyCounter.entries()) {
        if (now - counter.lastReset > oneDay) {
            counter.count = 0;
            counter.lastReset = now;
        }
    }
    
    // Filter akun yang belum mencapai batas harian
    const availableAccounts = emailAccounts.filter(account => {
        const counter = emailDailyCounter.get(account.email);
        return counter && counter.count < MAX_DAILY_EMAILS;
    });
    
    if (availableAccounts.length === 0) {
        // Fallback: jika semua mencapai batas, pilih yang paling jarang digunakan
        console.warn('Semua akun mendekati batas harian, menggunakan fallback');
        return emailAccounts.reduce((leastUsed, current) => {
            const currentCounter = emailDailyCounter.get(current.email) || { count: 0 };
            const leastUsedCounter = emailDailyCounter.get(leastUsed.email) || { count: 0 };
            return currentCounter.count < leastUsedCounter.count ? current : leastUsed;
        });
    }
    
    // Pilih akun dengan penggunaan terendah (bukan random!)
    availableAccounts.sort((a, b) => {
        const counterA = emailDailyCounter.get(a.email);
        const counterB = emailDailyCounter.get(b.email);
        return counterA.count - counterB.count;
    });
    
    const selectedAccount = availableAccounts[0];
    const counter = emailDailyCounter.get(selectedAccount.email);
    
    // Update counter
    counter.count++;
    counter.lastUsed = now;
    
    console.log(`Memilih: ${selectedAccount.email} (Count: ${counter.count})`);
    
    // Peringatan jika mendekati batas
    if (counter.count >= 400) {
        console.warn(`PERINGATAN: ${selectedAccount.email} mendekati batas harian (${counter.count}/450)`);
    }
    
    return selectedAccount;
}

// Fungsi untuk generate OTP
async function generateOtp(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Fungsi untuk menyimpan OTP
function storeOTP(userId, otp, expiryMinutes = 10) {
    const expiresAt = Date.now() + (expiryMinutes * 60 * 1000);
    otpStore.set(userId, {
        otp: otp,
        expiresAt: expiresAt,
        createdAt: Date.now(),
        email: userId,
        sentFrom: null
    });
}

// Fungsi untuk memverifikasi OTP
async function verifyOTP(userId, userInputOtp) {
    try {
        const storedData = otpStore.get(userId);
        
        if (!storedData) {
            return {
                success: false,
                message: "OTP tidak ditemukan atau sudah kadaluarsa",
                code: "OTP_EXPIRED"
            };
        }
        
        const { otp: validOtp, expiresAt } = storedData;
        
        if (Date.now() > expiresAt) {
            otpStore.delete(userId);
            return {
                success: false,
                message: "OTP sudah kadaluarsa",
                code: "OTP_EXPIRED"
            };
        }
        
        if (userInputOtp.toString() === validOtp.toString()) {
            otpStore.delete(userId);
            return {
                success: true,
                message: "Verifikasi berhasil",
                code: otp
            };
        } else {
            return {
                success: false,
                message: "Kode OTP salah",
                code: "INVALID_OTP"
            };
        }
    } catch (error) {
        console.error("Error verifying OTP:", error);
        return {
            success: false,
            message: "Terjadi kesalahan saat verifikasi",
            code: "VERIFICATION_ERROR"
        };
    }
}

// Fungsi untuk mengecek cooldown email
function checkEmailCooldown(email) {
    const cooldownData = emailCooldown.get(email);
    
    if (!cooldownData) {
        return {
            onCooldown: false,
            remainingTime: 0
        };
    }
    
    const now = Date.now();
    const cooldownEnd = cooldownData.endsAt;
    
    if (now < cooldownEnd) {
        const remainingSeconds = Math.ceil((cooldownEnd - now) / 1000);
        const remainingMinutes = Math.floor(remainingSeconds / 60);
        const remainingSecs = remainingSeconds % 60;
        
        return {
            onCooldown: true,
            remainingTime: remainingSeconds,
            message: `Silakan tunggu ${remainingMinutes} menit ${remainingSecs} detik sebelum meminta kode baru`,
            endsAt: cooldownEnd
        };
    } else {
        emailCooldown.delete(email);
        return {
            onCooldown: false,
            remainingTime: 0
        };
    }
}

// Fungsi untuk set cooldown email
function setEmailCooldown(email, cooldownMinutes = 15) {
    const endsAt = Date.now() + (cooldownMinutes * 60 * 1000);
    emailCooldown.set(email, {
        endsAt: endsAt,
        setAt: Date.now(),
        email: email
    });
}

// Fungsi untuk menghapus cooldown yang sudah selesai
function cleanupExpiredCooldowns() {
    const now = Date.now();
    for (const [email, data] of emailCooldown.entries()) {
        if (now > data.endsAt) {
            emailCooldown.delete(email);
        }
    }
}

// Fungsi untuk generate HTML email
const generateOtpEmailHtml = (otp, userName = "") => {
    const currentYear = new Date().getFullYear();
    
    return `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kode Verifikasi OTP Anda</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; background-color: #f7f9fc; }
        .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 0 0 20px 20px; }
        .logo { color: white; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .header-title { color: white; font-size: 28px; font-weight: 600; margin-top: 10px; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 18px; margin-bottom: 20px; color: #555; }
        .otp-container { background: #f8f9fa; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; border: 2px dashed #e0e0e0; }
        .otp-label { font-size: 16px; color: #666; margin-bottom: 15px; }
        .otp-code { font-size: 42px; font-weight: 700; letter-spacing: 10px; color: #2d3748; font-family: 'Courier New', monospace; padding: 10px; background: white; border-radius: 8px; margin: 15px 0; display: inline-block; min-width: 250px; }
        .validity { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px; }
        .warning { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 25px 0; border-radius: 4px; color: #721c24; }
        .instructions { margin: 30px 0; color: #666; }
        .step { display: flex; align-items: center; margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 8px; }
        .step-number { background: #667eea; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold; }
        .footer { background: #2d3748; color: white; padding: 30px 20px; text-align: center; border-radius: 20px 20px 0 0; }
        .company-info { margin-bottom: 20px; }
        .contact-support { margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px; }
        .copyright { margin-top: 20px; font-size: 12px; color: #a0aec0; }
        @media (max-width: 600px) {
            .content { padding: 20px; }
            .otp-code { font-size: 32px; letter-spacing: 8px; min-width: 200px; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">OTP AMAN</div>
            <h1 class="header-title">Verifikasi Keamanan</h1>
        </div>
        
        <div class="content">
            <p class="greeting">Halo ${userName || 'useriky'},</p>
            <p>Kami menerima permintaan verifikasi untuk akun Anda. Gunakan kode OTP berikut untuk melanjutkan:</p>
            
            <div class="otp-container">
                <div class="otp-label">Kode Verifikasi Anda:</div>
                <div class="otp-code">${otp}</div>
                <div style="color: #666; font-size: 14px; margin-top: 10px;">Kode ini berlaku selama 10 menit</div>
            </div>
            
            <div class="validity">
                <strong>⏰ Masa Berlaku:</strong> Kode ini hanya valid selama 10 menit sejak email ini dikirim.
            </div>
            
            <div class="instructions">
                <h3 style="margin-bottom: 20px; color: #333;">Langkah-langkah Verifikasi:</h3>
                <div class="step">
                    <div class="step-number">1</div>
                    <div>Salin kode OTP di atas</div>
                </div>
                <div class="step">
                    <div class="step-number">2</div>
                    <div>Kembali ke aplikasi atau situs web</div>
                </div>
                <div class="step">
                    <div class="step-number">3</div>
                    <div>Tempelkan kode OTP pada kolom yang disediakan</div>
                </div>
            </div>
            
            <div class="warning">
                <strong>⚠️ PERHATIAN:</strong> 
                <ul style="margin-top: 10px; padding-left: 20px;">
                    <li>Jangan pernah membagikan kode OTP ini kepada siapapun</li>
                    <li>Tim kami tidak akan pernah meminta kode OTP Anda</li>
                    <li>Jika Anda tidak meminta kode ini, abaikan email ini</li>
                    <li>Untuk keamanan, Anda hanya dapat meminta kode baru setiap 15 menit</li>
                </ul>
            </div>
            
            <p style="margin-top: 30px; color: #666;">
                Jika Anda mengalami kesulitan, silakan hubungi tim support kami.
            </p>
        </div>
        
        <div class="footer">
            <div class="company-info">
                <h3 style="margin-bottom: 15px;">IkyJs</h3>
                <p>Menyediakan solusi teknologi aman dan terpercaya</p>
            </div>
            
            <div class="contact-support">
                <p><strong>📧 Dukungan Teknis:</strong> ikyhzreal@gmail.com</p>
                <p><strong>🌐 Website:</strong> https://api-cloudiky.vercel.app</p>
            </div>
            
            <div class="copyright">
                <p>&copy; ${currentYear} IkyJs. Hak Cipta Dilindungi.</p>
                <p style="margin-top: 5px;">Email ini dikirim otomatis, mohon tidak membalas.</p>
            </div>
        </div>
    </div>
</body>
</html>`;
};

// Fungsi untuk mengirim OTP
async function sendOtpEmail(email, otp, userName = "") {
    try {
        const nodemailer = require('nodemailer');
        
        // Pilih email account dengan load balancing
        const emailAccount = getBalancedEmailAccount();
        
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailAccount.email,
                pass: emailAccount.password
            }
        });
        
        let mailOptions = {
            from: `"IkyJs Verifikasi" <${emailAccount.email}>`,
            to: email,
            subject: 'Kode Verifikasi OTP Anda - IkyJs',
            html: generateOtpEmailHtml(otp, userName)
        };
        
        const info = await transporter.sendMail(mailOptions);
        
        // Update stored data dengan informasi email pengirim
        const storedData = otpStore.get(email);
        if (storedData) {
            storedData.sentFrom = emailAccount.email;
            otpStore.set(email, storedData);
        }
        
        return {
            success: true,
            messageId: info.messageId,
            message: "Email OTP berhasil dikirim",
            sentFrom: emailAccount.email
        };
    } catch (error) {
        console.error("Error sending email:", error);
        
        // Jika error karena limit, catat dan nonaktifkan sementara akun ini
        if (error.message.includes('Daily user sending limit exceeded')) {
            console.error(`DISABLING: ${emailAccount.email} karena limit harian`);
        }
        
        return {
            success: false,
            error: error.message
        };
    }
}

// Fungsi untuk menghapus OTP lama
function cleanupExpiredOTPs() {
    const now = Date.now();
    for (const [userId, data] of otpStore.entries()) {
        if (now > data.expiresAt) {
            otpStore.delete(userId);
        }
    }
}

// Fungsi untuk reset counter harian
function resetDailyCounters() {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    for (const [email, counter] of emailDailyCounter.entries()) {
        if (now - counter.lastReset > oneDay) {
            counter.count = 0;
            counter.lastReset = now;
            console.log(`[SCHEDULED] Reset counter untuk ${email}`);
        }
    }
}

// Jadwalkan reset setiap 6 jam
setInterval(resetDailyCounters, 6 * 60 * 60 * 1000);

// Eksport modul
module.exports = {
    name: "Gmail Kode",
    desc: "Gunakan untuk daftar via gmail dengan load balancing 5 email",
    category: "Tools",
    path: "/tools/gmailkode?apikey=&email=",
    
    async run(req, res) {
        try {
            const { apikey, email, otp } = req.query;
            
            if (!apikey || !global.apikey.includes(apikey)) {
                return res.json({ 
                    status: false, 
                    error: 'Apikey invalid' 
                });
            }
            
            if (!email) {
                return res.json({ 
                    status: false, 
                    error: 'Email is required' 
                });
            }
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.json({ 
                    status: false, 
                    error: 'Format email tidak valid' 
                });
            }
            
            if (otp) {
                const verificationResult = await verifyOTP(email, otp);
                
                return res.json({
                    status: verificationResult.success,
                    message: verificationResult.message,
                    code: verificationResult.code,
                    data: {
                        email: email,
                        verified: verificationResult.success,
                        timestamp: new Date().toISOString()
                    }
                });
            }
            
            cleanupExpiredOTPs();
            cleanupExpiredCooldowns();
            
            const cooldownCheck = checkEmailCooldown(email);
            
            if (cooldownCheck.onCooldown) {
                return res.json({
                    status: false,
                    error: "Email sedang dalam cooldown",
                    message: cooldownCheck.message,
                    data: {
                        email: email,
                        cooldown: true,
                        remainingTime: cooldownCheck.remainingTime,
                        remainingMinutes: Math.floor(cooldownCheck.remainingTime / 60),
                        remainingSeconds: cooldownCheck.remainingTime % 60
                    }
                });
            }
            
            const generatedOtp = await generateOtp(1000, 9999);
            
            storeOTP(email, generatedOtp, 10);
            
            setEmailCooldown(email, 15);
            
            const emailResult = await sendOtpEmail(email, generatedOtp);
            
            if (emailResult.success) {
                return res.json({
                    status: true,
                    message: "Kode OTP berhasil dikirim ke email Anda",
                    data: {
                        email: email,
                        otpSent: true,
                        otp: generatedOtp,
                        messageId: emailResult.messageId,
                        sentFrom: emailResult.sentFrom,
                        expiresIn: "10 menit",
                        cooldown: "15 menit",
                        nextRequestAvailable: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                        timestamp: new Date().toISOString()
                    }
                });
            } else {
                otpStore.delete(email);
                emailCooldown.delete(email);
                
                return res.json({
                    status: false,
                    error: "Gagal mengirim email OTP",
                    details: emailResult.error
                });
            }
            
        } catch (error) {
            console.error("Error in Gmail Kode handler:", error);
            return res.json({
                status: false,
                error: "Terjadi kesalahan internal server",
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
};