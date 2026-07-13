const path = require('path');
const fs = require('fs');

const loadCommands = () => {
    const commands = {};
    const commandsPath = __dirname;
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js') && file !== 'index.js');

    for (const file of commandFiles) {
        try {
            const command = require(path.join(commandsPath, file));
            if (command.name && command.execute) {
                commands[command.name] = command;
            }
        } catch (err) {
            console.error(`[ERROR] Failed to load command ${file}:`, err.message);
        }
    }

    return commands;
};

const getCommands = () => loadCommands();

module.exports = { loadCommands, getCommands };
