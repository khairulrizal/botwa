const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'sakti',
    description: 'Tampilkan data akun sakti',
    execute: (sock, message, args, context) => {
        try {
            const dataPath = path.join(__dirname, '..', 'data', 'sakti.json');
            const rawData = fs.readFileSync(dataPath, 'utf8');
            const users = JSON.parse(rawData);

            let text = `*DATA AKUN SAKTI*\n\n`;

            users.forEach((user, index) => {
                text += `*${index + 1}. ${user.name}*\n`;
                text += `NIK: ${user.nik}\n`;
                text += `Password: ${user.password}\n\n`;
            });

            text += `─────────────────\n`;
            text += `*Untuk copy:* Tekan lama pada NIK/Password`;

            return text;
        } catch (err) {
            return 'Gagal membaca data sakti. Hubungi admin.';
        }
    }
};
