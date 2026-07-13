module.exports = {
    name: 'ping',
    description: 'Check if bot is alive and show response time',
    execute: async (sock, message, args, context) => {
        const uptimeMs = Date.now() - context.startTime;
        const seconds = Math.floor(uptimeMs / 1000) % 60;
        const minutes = Math.floor(uptimeMs / 60000) % 60;
        const hours = Math.floor(uptimeMs / 3600000);

        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 50));
        const responseTime = Date.now() - startTime;

        return `🏓 *Pong!*\n\n` +
               `⏱️ Response time: ${responseTime}ms\n` +
               `⏰ Uptime: ${hours}h ${minutes}m ${seconds}s`;
    }
};
