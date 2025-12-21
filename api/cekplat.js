const wilayahPlat = {
    'A': 'Banten',
    'AA': 'Magelang',
    'AB': 'Yogyakarta',
    'AD': 'Surakarta (Solo)',
    'AE': 'Madiun',
    'AG': 'Kediri',
    'B': 'Jakarta',
    'BA': 'Sumatera Barat',
    'BB': 'Sumatera Utara (Tapanuli)',
    'BD': 'Bengkulu',
    'BE': 'Lampung',
    'BG': 'Sumatera Selatan',
    'BH': 'Jambi',
    'BK': 'Sumatera Utara (Medan)',
    'BL': 'Nanggroe Aceh Darussalam',
    'BM': 'Riau',
    'BN': 'Kepulauan Bangka Belitung',
    'BP': 'Kepulauan Riau',
    'CC': 'Kalimantan Barat',
    'DA': 'Kalimantan Selatan',
    'DB': 'Sulawesi Utara (Manado)',
    'DC': 'Sulawesi Barat',
    'DD': 'Sulawesi Selatan (Makassar)',
    'DE': 'Maluku',
    'DG': 'Maluku Utara',
    'DH': 'Nusa Tenggara Timur (Kupang)',
    'DK': 'Bali',
    'DL': 'Sulawesi Utara (Gorontalo)',
    'DM': 'Sulawesi Utara (Kepulauan Sangihe)',
    'DN': 'Sulawesi Tengah',
    'DP': 'Sulawesi Selatan (Parepare)',
    'DR': 'Nusa Tenggara Barat (Lombok)',
    'DS': 'Papua Barat',
    'DT': 'Sulawesi Tenggara',
    'E': 'Jawa Barat (Cirebon)',
    'EA': 'Kalimantan Timur',
    'EB': 'Kalimantan Utara',
    'ED': 'Kalimantan Tengah',
    'F': 'Jawa Barat (Bogor)',
    'G': 'Jawa Tengah (Pekalongan)',
    'H': 'Jawa Tengah (Semarang)',
    'K': 'Jawa Timur (Malang)',
    'KB': 'Kalimantan Barat (Singkawang)',
    'KH': 'Kalimantan Tengah (Palangkaraya)',
    'KT': 'Kalimantan Timur (Samarinda)',
    'L': 'Jawa Timur (Surabaya)',
    'M': 'Madura',
    'N': 'Jawa Timur (Malang)',
    'P': 'Jawa Timur (Besuki)',
    'R': 'Banyumas',
    'S': 'Jawa Timur (Bojonegoro)',
    'T': 'Jawa Barat (Karawang)',
    'W': 'Surabaya (Gresik)',
    'Z': 'Jawa Barat (Bandung)'
};

module.exports = {
    name: "cekplat",
    desc: "Cek wilayah berdasarkan plat nomor kendaraan Indonesia",
    category: "Tools",
    path: "/tools/cekplat?apikey=&plat=",

    async run(req, res) {
        try {
            const { apikey, plat } = req.query;
            
            // Validasi API Key
            if (!apikey || !global.apikey.includes(apikey)) {
                return res.json({ 
                    status: false, 
                    error: 'Apikey invalid' 
                });
            }
            
            // Validasi input plat
            if (!plat) {
                return res.json({ 
                    status: false, 
                    error: 'Parameter plat diperlukan' 
                });
            }
            
            // Bersihkan dan format plat
            const platBersih = plat.toUpperCase().replace(/\s+/g, '');
            
            // Cari kode wilayah (1-2 karakter pertama)
            let kodeWilayah = '';
            let wilayah = '';
            
            // Coba cari dengan 2 karakter pertama
            if (platBersih.length >= 2) {
                kodeWilayah = platBersih.substring(0, 2);
                if (wilayahPlat[kodeWilayah]) {
                    wilayah = wilayahPlat[kodeWilayah];
                }
            }
            
            // Jika tidak ditemukan dengan 2 karakter, coba dengan 1 karakter
            if (!wilayah && platBersih.length >= 1) {
                kodeWilayah = platBersih.substring(0, 1);
                if (wilayahPlat[kodeWilayah]) {
                    wilayah = wilayahPlat[kodeWilayah];
                }
            }
            
            // Format response
            if (wilayah) {
                return res.json({
                    status: true,
                    data: {
                        plat_input: plat,
                        plat_bersih: platBersih,
                        kode_wilayah: kodeWilayah,
                        wilayah: wilayah,
                        penjelasan: `Plat nomor ${platBersih} berasal dari wilayah ${wilayah} (Kode: ${kodeWilayah})`
                    }
                });
            } else {
                return res.json({
                    status: false,
                    error: 'Kode plat tidak dikenal atau format tidak valid',
                    data: {
                        plat_input: plat,
                        plat_bersih: platBersih,
                        kode_wilayah: kodeWilayah,
                        saran: 'Pastikan kode plat sesuai dengan daftar kode wilayah Indonesia'
                    }
                });
            }
            
        } catch (error) {
            console.error(error);
            return res.json({ 
                status: false, 
                error: 'Terjadi kesalahan server',
                detail: error.message 
            });
        }
    }
};