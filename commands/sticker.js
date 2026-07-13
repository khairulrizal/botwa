const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'sticker',
    description: 'Convert image to sticker (reply to an image with !sticker)',
    execute: async (sock, message, args, context) => {
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted?.imageMessage) {
            return '❌ Reply to an image with !sticker to convert it.';
        }

        try {
            const buffer = await downloadMediaMessage(
                { ...message, message: quoted },
                'buffer',
                {}
            );
            await sock.sendMessage(context.chatId, {
                sticker: buffer,
                mimetype: 'image/webp',
            });
            return null;
        } catch (err) {
            return `❌ Failed to create sticker: ${err.message}`;
        }
    },
};
