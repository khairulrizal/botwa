module.exports = {
    name: 'alive',
    description: 'Show bot status information',
    execute: async (sock, message, args, context) => {
        const uptimeMs = Date.now() - context.startTime;
        const seconds = Math.floor(uptimeMs / 1000) % 60;
        const minutes = Math.floor(uptimeMs / 60000) % 60;
        const hours = Math.floor(uptimeMs / 3600000);

        const memUsage = process.memoryUsage();
        const rss = (memUsage.rss / 1024 / 1024).toFixed(1);
        const heap = (memUsage.heapUsed / 1024 / 1024).toFixed(1);

        return `🟢 *Bot Status*\n\n` +
               `Node.js: ${process.version}\n` +
               `Platform: ${process.platform}\n` +
               `Uptime: ${hours}h ${minutes}m ${seconds}s\n` +
               `Memory: ${rss}MB RSS, ${heap}MB heap\n` +
               `Commands loaded: ${Object.keys(context.commands).length}`;
    }
};
