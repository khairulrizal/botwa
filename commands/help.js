module.exports = {
    name: 'help',
    description: 'Show help for a specific command',
    execute: async (sock, message, args, context) => {
        const commands = context.commands;

        if (args.length === 0) {
            const commandList = Object.values(commands)
                .map(cmd => `• !${cmd.name} - ${cmd.description}`)
                .join('\n');
            return `📖 *Help*\n\n` +
                   `Usage: !help <command>\n\n` +
                   `Available commands:\n${commandList}`;
        }

        const commandName = args[0].toLowerCase();
        const command = commands[commandName];

        if (!command) {
            return `❌ Command "!${commandName}" not found.\n\n` +
                   `Use !help to see available commands.`;
        }

        return `📖 *Help: !${command.name}*\n\n` +
               `${command.description}`;
    }
};
