module.exports = {
    name: 'ping',
    description: 'Check if bot is alive',
    execute: (sock, message) => {
        return 'Pong!';
    }
};