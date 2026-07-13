module.exports = {
    name: 'menu',
    description: 'Show available commands',
    execute: async (sock, message, args, context) => {
        const commands = context.commands;
        const commandList = Object.values(commands)
            .map(cmd => `• !${cmd.name} - ${cmd.description}`)
            .join('\n');

        return `📋 *Bot Menu*\n\n` +
               `${commandList}\n\n` +
               `Total commands: ${Object.keys(commands).length}`;
    }
};
