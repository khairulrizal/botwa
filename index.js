const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { loadCommands } = require('./commands');
const autoreply = require('./commands/autoreply');

const BOT_START_TIME = Date.now();
const PHONE_NUMBER = '62895329678069';

const log = (level, ...args) => {
    const timestamp = new Date().toISOString();
    console[level === 'error' ? 'error' : 'log'](`[${timestamp}] [${level.toUpperCase()}]`, ...args);
};

const startBot = async () => {
    const commands = loadCommands();
    log('info', `Loaded ${Object.keys(commands).length} commands:`, Object.keys(commands).join(', '));

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();
    log('info', 'Baileys version:', version.join('.'));

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: ['BOT SAKTI', 'Chrome', '1.0.0'],
    });

    let pairingRequested = false;
    let isConnecting = false;

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        log('info', `Connection update: ${connection || 'pending'}`);

        if (qr && !pairingRequested && !isConnecting) {
            pairingRequested = true;
            isConnecting = true;
            log('info', 'QR Code received. Requesting pairing code...');
            try {
                const code = await sock.requestPairingCode(PHONE_NUMBER);
                log('info', '========================================');
                log('info', `PAIRING CODE: ${code}`);
                log('info', '========================================');
                log('info', 'Buka WhatsApp → Linked Devices → Link with Phone Number');
                log('info', 'Masukkan kode di atas dalam 30 detik');
            } catch (err) {
                log('error', 'Failed to request pairing code:', err.message);
                isConnecting = false;
            }
        }

        if (connection === 'close') {
            isConnecting = false;
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            log('warn', `Connection closed (code: ${statusCode})`);

            if (statusCode === DisconnectReason.loggedOut) {
                log('error', 'Logged out. Restart container to re-pair.');
            } else {
                log('info', 'Reconnecting in 3 seconds...');
                setTimeout(() => {
                    pairingRequested = false;
                    startBot();
                }, 3000);
            }
        } else if (connection === 'open') {
            log('info', 'Bot connected successfully!');
            pairingRequested = false;
            isConnecting = false;
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.key.fromMe && msg.message) {
                const chatId = msg.key.remoteJid;
                const isGroup = chatId.endsWith('@g.us');
                const senderId = isGroup ? (msg.key.participant || msg.participant) : msg.key.remoteJid;

                let messageText = '';
                if (msg.message.conversation) {
                    messageText = msg.message.conversation;
                } else if (msg.message.extendedTextMessage?.text) {
                    messageText = msg.message.extendedTextMessage.text;
                } else if (msg.message.imageMessage?.caption) {
                    messageText = msg.message.imageMessage.caption;
                } else if (msg.message.videoMessage?.caption) {
                    messageText = msg.message.videoMessage.caption;
                }

                if (!messageText) return;

                if (messageText.startsWith('!')) {
                    const parts = messageText.split(' ');
                    const commandName = parts[0].slice(1).toLowerCase();
                    const args = parts.slice(1);
                    const command = commands[commandName];

                    if (command) {
                        const context = {
                            chatId,
                            senderId,
                            isGroup,
                            message: msg,
                            startTime: BOT_START_TIME,
                            commands,
                        };

                        log('info', `Command !${commandName} from ${senderId}`);
                        const start = Date.now();
                        try {
                            const reply = await command.execute(sock, msg, args, context);
                            const elapsed = Date.now() - start;
                            if (reply) {
                                await sock.sendMessage(chatId, { text: reply });
                                log('info', `Command !${commandName} executed in ${elapsed}ms`);
                            }
                        } catch (cmdError) {
                            log('error', `Error executing !${commandName}:`, cmdError.message);
                            await sock.sendMessage(chatId, { text: `Error: ${cmdError.message}` });
                        }
                        return;
                    }
                }

                const autoReplyResponse = autoreply.check(messageText);
                if (autoReplyResponse) {
                    await sock.sendMessage(chatId, { text: autoReplyResponse });
                    log('info', `Auto-reply triggered for: ${messageText}`);
                    return;
                }
            }
        } catch (err) {
            log('error', 'Message handling error:', err.message);
        }
    });
};

const shutdown = (signal) => {
    log('info', `Received ${signal}. Shutting down gracefully...`);
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
    log('error', 'Uncaught exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
    log('error', 'Unhandled rejection:', reason);
});

startBot().catch((err) => {
    log('error', 'Failed to start bot:', err.message);
    process.exit(1);
});
