const fs = require('fs');
const path = require('path');

const ADMIN_NUMBERS = ['62895329678069', '6282165656083'];

const dataPath = path.join(__dirname, '..', 'data', 'sakti.json');

const readData = () => {
    try {
        const rawData = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(rawData);
    } catch (err) {
        return [];
    }
};

const writeData = (data) => {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 4), 'utf8');
};

module.exports = {
    name: 'updatesakti',
    description: 'Update data akun sakti (admin only)',
    execute: (sock, message, args, context) => {
        const sender = message.key.participant || message.key.remoteJid;
        const senderNumber = sender.replace(/@.*$/, '');

        if (!ADMIN_NUMBERS.includes(senderNumber)) {
            return 'Hanya admin yang bisa mengupdate data!';
        }

        if (args.length < 1) {
            return `*Cara penggunaan:*
!updatesakti add [nama] | [nik] | [password]
!updatesakti update [nama] | [nik] | [password]
!updatesakti delete [nama]
!updatesakti list`;
        }

        const action = args[0].toLowerCase();
        let data = readData();

        switch (action) {
            case 'add': {
                const rest = args.slice(1).join(' ');
                const parts = rest.split('|').map(p => p.trim());
                
                if (parts.length < 3) {
                    return 'Format: !updatesakti add [nama] | [nik] | [password]';
                }

                const [name, nik, password] = parts;
                
                const exists = data.find(u => u.nik === nik);
                if (exists) {
                    return `NIK ${nik} sudah ada di database!`;
                }

                data.push({ name, nik, password });
                writeData(data);
                return `Berhasil menambahkan:\n*${name}*\nNIK: ${nik}`;
            }

            case 'update': {
                const rest = args.slice(1).join(' ');
                const parts = rest.split('|').map(p => p.trim());
                
                if (parts.length < 3) {
                    return 'Format: !updatesakti update [nama] | [nik] | [password]';
                }

                const [name, nik, password] = parts;
                
                const index = data.findIndex(u => u.name.toLowerCase() === name.toLowerCase());
                if (index === -1) {
                    return `User "${name}" tidak ditemukan!`;
                }

                data[index] = { name, nik, password };
                writeData(data);
                return `Berhasil update data:\n*${name}*\nNIK: ${nik}`;
            }

            case 'delete': {
                const name = args.slice(1).join(' ');
                
                if (!name) {
                    return 'Format: !updatesakti delete [nama]';
                }

                const index = data.findIndex(u => u.name.toLowerCase() === name.toLowerCase());
                if (index === -1) {
                    return `User "${name}" tidak ditemukan!`;
                }

                const deleted = data.splice(index, 1);
                writeData(data);
                return `Berhasil menghapus: *${deleted[0].name}*`;
            }

            case 'list': {
                if (data.length === 0) {
                    return 'Database kosong!';
                }

                let text = '*DAFTAR AKUN SAKTI:*\n\n';
                data.forEach((user, i) => {
                    text += `${i + 1}. ${user.name}\n`;
                });
                return text;
            }

            default:
                return 'Action tidak valid! Gunakan: add, update, delete, list';
        }
    }
};
