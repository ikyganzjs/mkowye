const wilayahPlat = {
    'A': { daerah: 'Kota Tangerang Selatan', provinsi: 'Provinsi Banten', samsat: 'Samsat Ciputat', alamat: 'Jl. RE Martadinata No.10, Ciputat, Kec. Ciputat, Kota Tangerang Selatan, Banten' },
    'B': { daerah: 'Jakarta Pusat', provinsi: 'DKI Jakarta', samsat: 'Samsat Jakarta Pusat', alamat: 'Jl. Tanah Abang I No.1, Jakarta Pusat' },
    'AB': { daerah: 'Yogyakarta', provinsi: 'DI Yogyakarta', samsat: 'Samsat Yogyakarta', alamat: 'Jl. Ring Road Utara, Yogyakarta' },
    'AD': { daerah: 'Surakarta', provinsi: 'Jawa Tengah', samsat: 'Samsat Solo', alamat: 'Jl. Adi Sucipto, Surakarta' },
    'AE': { daerah: 'Madiun', provinsi: 'Jawa Timur', samsat: 'Samsat Madiun', alamat: 'Jl. Pahlawan, Madiun' },
    'BA': { daerah: 'Padang', provinsi: 'Sumatera Barat', samsat: 'Samsat Padang', alamat: 'Jl. Khatib Sulaiman, Padang' },
    'BB': { daerah: 'Medan', provinsi: 'Sumatera Utara', samsat: 'Samsat Medan', alamat: 'Jl. Gatot Subroto, Medan' },
    'BD': { daerah: 'Bengkulu', provinsi: 'Bengkulu', samsat: 'Samsat Bengkulu', alamat: 'Jl. Suprapto, Bengkulu' },
    'BE': { daerah: 'Bandar Lampung', provinsi: 'Lampung', samsat: 'Samsat Bandar Lampung', alamat: 'Jl. Wolter Monginsidi, Bandar Lampung' },
    'BG': { daerah: 'Palembang', provinsi: 'Sumatera Selatan', samsat: 'Samsat Palembang', alamat: 'Jl. Jenderal Sudirman, Palembang' },
    'BH': { daerah: 'Jambi', provinsi: 'Jambi', samsat: 'Samsat Jambi', alamat: 'Jl. Sultan Thaha, Jambi' },
    'BK': { daerah: 'Medan', provinsi: 'Sumatera Utara', samsat: 'Samsat Medan Timur', alamat: 'Jl. Sisingamangaraja, Medan' },
    'BL': { daerah: 'Banda Aceh', provinsi: 'Aceh', samsat: 'Samsat Banda Aceh', alamat: 'Jl. Tgk Chik Ditiro, Banda Aceh' }
};

module.exports = {
    name: "cekplat",
    desc: "Cek daerah plat nomor kendaraan online",
    category: "Tools",
    path: "/tools/cekplat?apikey=&plat=",

    async run(req, res) {
        try {
            const { apikey, plat } = req.query;
            
            // Validasi API Key
            if (!apikey || !global.apikey.includes(apikey)) {
                return res.json({ 
                    status: false, 
                    error: 'Apikey invalid',
                    message: 'Silakan gunakan API key yang valid untuk mengakses layanan ini.'
                });
            }
            
            // Validasi input plat
            if (!plat) {
                return res.json({ 
                    status: false, 
                    error: 'Parameter plat diperlukan',
                    message: 'Masukkan plat nomor kendaraan yang ingin dicek.'
                });
            }
            
            // Bersihkan dan format plat
            const platBersih = plat.toUpperCase().replace(/\s+/g, '');
            
            // Ekstrak bagian plat
            const platDepan = platBersih.match(/^[A-Z]+/)?.[0] || '';
            const platAngka = platBersih.match(/\d+/)?.[0] || '';
            const platBelakang = platBersih.match(/[A-Z]+$/)?.[0] || '';
            
            // Cari kode wilayah
            let kodeWilayah = '';
            let dataWilayah = null;
            
            // Coba cari dengan 2 karakter pertama
            if (platDepan.length >= 2) {
                const kodeDuaKarakter = platDepan.substring(0, 2);
                if (wilayahPlat[kodeDuaKarakter]) {
                    kodeWilayah = kodeDuaKarakter;
                    dataWilayah = wilayahPlat[kodeDuaKarakter];
                }
            }
            
            // Jika tidak ditemukan dengan 2 karakter, coba dengan 1 karakter
            if (!dataWilayah && platDepan.length >= 1) {
                const kodeSatuKarakter = platDepan.substring(0, 1);
                if (wilayahPlat[kodeSatuKarakter]) {
                    kodeWilayah = kodeSatuKarakter;
                    dataWilayah = wilayahPlat[kodeSatuKarakter];
                }
            }
            
            // Format response sesuai tampilan website
            if (dataWilayah) {
                return res.json({
                    status: true,
                    title: "INFO SAMSAT",
                    subtitle: "Cek Daerah Plat Nomor Kendaraan Online",
                    description: "Cek asal daerah plat nomor kendaraan secara online dengan mudah. Temukan informasi lengkap tentang wilayah pendaftaran kendaraan, Samsat yang berwenang, hingga alamat lengkap kantor Samsat.",
                    
                    data_plat: {
                        depan: platDepan,
                        angka: platAngka,
                        belakang: platBelakang,
                        format_lengkap: `${platDepan} ${platAngka} ${platBelakang}`
                    },
                    
                    hasil_cek: {
                        daerah_kendaraan: dataWilayah.daerah,
                        provinsi: dataWilayah.provinsi,
                        wilayah_samsat: dataWilayah.samsat,
                        alamat_samsat: dataWilayah.alamat
                    },
                    
                    metadata: {
                        plat_input: plat,
                        plat_bersih: platBersih,
                        kode_wilayah: kodeWilayah,
                        timestamp: new Date().toISOString()
                    },
                    
                    tampilan_html: `<!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                max-width: 600px;
                                margin: 0 auto;
                                padding: 20px;
                            }
                            .header {
                                background: #2c3e50;
                                color: white;
                                padding: 20px;
                                text-align: center;
                                border-radius: 5px 5px 0 0;
                            }
                            .plat-container {
                                background: #ecf0f1;
                                padding: 20px;
                                text-align: center;
                                margin: 20px 0;
                            }
                            .plat-display {
                                font-size: 24px;
                                font-weight: bold;
                                letter-spacing: 5px;
                                color: #2c3e50;
                            }
                            .hasil-section {
                                background: white;
                                border: 1px solid #ddd;
                                padding: 20px;
                                border-radius: 5px;
                            }
                            .info-item {
                                margin: 10px 0;
                                padding: 10px;
                                border-bottom: 1px solid #eee;
                            }
                            .info-label {
                                font-weight: bold;
                                color: #2c3e50;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>INFO SAMSAT</h1>
                            <h2>Cek Daerah Plat Nomor Kendaraan Online</h2>
                        </div>
                        
                        <div class="plat-container">
                            <h3>Cek Plat Nomor Kendaraan</h3>
                            <div class="plat-display">
                                ${platDepan} ${platAngka} ${platBelakang}
                            </div>
                        </div>
                        
                        <div class="hasil-section">
                            <h3>Hasil Pengecekan:</h3>
                            <div class="info-item">
                                <span class="info-label">Daerah Kendaraan:</span><br>
                                ${dataWilayah.daerah}
                            </div>
                            <div class="info-item">
                                <span class="info-label">Provinsi:</span><br>
                                ${dataWilayah.provinsi}
                            </div>
                            <div class="info-item">
                                <span class="info-label">Wilayah Samsat:</span><br>
                                ${dataWilayah.samsat}
                            </div>
                            <div class="info-item">
                                <span class="info-label">Alamat Samsat:</span><br>
                                ${dataWilayah.alamat}
                            </div>
                        </div>
                    </body>
                    </html>`
                });
            } else {
                return res.json({
                    status: false,
                    error: 'Kode plat tidak dikenal',
                    message: 'Plat nomor yang Anda masukkan tidak terdaftar dalam database kami.',
                    data_plat: {
                        depan: platDepan,
                        angka: platAngka,
                        belakang: platBelakang,
                        format_lengkap: `${platDepan} ${platAngka} ${platBelakang}`
                    },
                    saran: 'Pastikan kode plat sesuai dengan daftar wilayah Indonesia yang valid. Contoh: B 6342 WKW untuk Kota Tangerang Selatan'
                });
            }
            
        } catch (error) {
            console.error('Error cek plat:', error);
            return res.json({ 
                status: false, 
                error: 'Terjadi kesalahan server',
                detail: error.message,
                message: 'Silakan coba lagi beberapa saat.'
            });
        }
    }
};