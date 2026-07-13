module.exports = {
    name: 'sakti',
    description: 'Tampilkan informasi bot sakti',
    execute: (sock, message, args, context) => {
        const info = {
            name: 'BOT SAKTI',
            version: '1.0.0',
            creator: 'Khairul Rizal',
            platform: 'Railway',
            library: 'Baileys',
            features: [
                'Auto-reply by keyword',
                'Sticker maker',
                'Tag all members',
                'Admin commands (kick)',
                'Multiple commands'
            ],
            commands: [
                '!ping - Cek bot hidup',
                '!menu - Tampilkan menu',
                '!alive - Status bot',
                '!help - Bantuan',
                '!sakti - Info bot sakti',
                '!sticker - Buat sticker dari gambar',
                '!tagall - Mention semua member',
                '!kick - Kick member (admin)'
            ],
            uptime: Math.floor((Date.now() - context.startTime) / 1000),
            message: 'Bot ini dibuat dengan ❤️'
        };

        let text = `╔══════════════════════╗\n`;
        text += `║     ${info.name}     ║\n`;
        text += `╚══════════════════════╝\n\n`;
        text += `📌 *Version:* ${info.version}\n`;
        text += `👤 *Creator:* ${info.creator}\n`;
        text += `🌐 *Platform:* ${info.platform}\n`;
        text += `📚 *Library:* ${info.library}\n`;
        text += `⏰ *Uptime:* ${Math.floor(info.uptime / 3600)}j ${Math.floor((info.uptime % 3600) / 60)}m ${info.uptime % 60}s\n\n`;
        text += `✨ *Features:*\n`;
        info.features.forEach(f => text += `• ${f}\n`);
        text += `\n📋 *Commands:*\n`;
        info.commands.forEach(c => text += `• ${c}\n`);
        text += `\n💬 ${info.message}`;

        return text;
    }
};
