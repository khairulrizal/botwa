const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'sakti',
    description: 'Tampilkan data akun sakti terupdate',
    execute: (sock, message, args, context) => {
        try {
            const dataPath = path.join(__dirname, '..', 'data', 'sakti.json');
            const rawData = fs.readFileSync(dataPath, 'utf8');
            const data = JSON.parse(rawData);

            let text = `╔══════════════════════╗\n`;
            text += `║    DATA AKUN SAKTI   ║\n`;
            text += `╚══════════════════════╝\n\n`;
            text += `👤 *Nama:* ${data.name}\n`;
            text += `🪪 *NIK:* ${data.nik}\n`;
            text += `🔐 *Password:* ${data.password}\n`;
            text += `📅 *Last Updated:* ${data.lastUpdated}\n`;

            return text;
        } catch (err) {
            return '❌ Gagal membaca data sakti. Hubungi admin.';
        }
    }
};
