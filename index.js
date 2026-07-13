const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { loadCommands } = require('./commands');

const BOT_START_TIME = Date.now();

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
        printQRInTerminal: true,
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            log('warn', `Connection closed (code: ${statusCode}). Reconnecting: ${shouldReconnect}`);

            if (shouldReconnect) {
                startBot();
            } else {
                log('error', 'Logged out. Please delete auth_info_baileys and re-scan QR.');
                process.exit(1);
            }
        } else if (connection === 'open') {
            log('info', 'Bot connected successfully!');
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

                const context = {
                    chatId,
                    senderId,
                    isGroup,
                    message: msg,
                    startTime: BOT_START_TIME,
                    commands,
                };

                log('info', `Message from ${senderId} in ${isGroup ? 'group' : 'private'}: ${messageText}`);

                if (messageText.startsWith('!')) {
                    const parts = messageText.split(' ');
                    const commandName = parts[0].slice(1).toLowerCase();
                    const args = parts.slice(1);
                    const command = commands[commandName];

                    if (command) {
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
                    }
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
