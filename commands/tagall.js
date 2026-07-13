module.exports = {
    name: 'tagall',
    description: 'Mention all group members (group only)',
    execute: async (sock, message, args, context) => {
        if (!context.isGroup) {
            return '❌ This command can only be used in groups.';
        }

        try {
            const groupMetadata = await sock.groupMetadata(context.chatId);
            const members = groupMetadata.participants.map(p => p.id);
            const tagList = members.map(id => `@${id.split('@')[0]}`).join('\n');
            const customMessage = args.length > 0 ? args.join(' ') : 'Attention everyone!';

            await sock.sendMessage(context.chatId, {
                text: `📢 *${customMessage}*\n\n${tagList}`,
                mentions: members,
            });
            return null;
        } catch (err) {
            return `❌ Failed to tag members: ${err.message}`;
        }
    },
};
