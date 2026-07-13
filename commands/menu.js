module.exports = {
    name: 'menu',
    description: 'Show available commands',
    execute: (sock, message) => {
        return `📋 *Bot Menu*\n\n` +
               `!ping - Check if bot is alive\n` +
               `!menu - Show this menu\n`;
    }
};