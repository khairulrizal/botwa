module.exports = {
    name: 'kick',
    description: 'Remove a user from group (admin only, reply to their message)',
    execute: async (sock, message, args, context) => {
        if (!context.isGroup) {
            return '❌ This command can only be used in groups.';
        }

        const quoted = message.message?.extendedTextMessage?.contextInfo;
        if (!quoted?.participant) {
            return '❌ Reply to a user\'s message with !kick to remove them.';
        }

        const targetId = quoted.participant;
        const senderId = context.senderId;

        try {
            const groupMetadata = await sock.groupMetadata(context.chatId);
            const botId = sock.user.id.replace(/:.*$/, '') + '@s.whatsapp.net';
            const botIsAdmin = groupMetadata.participants.some(
                p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin')
            );
            const senderIsAdmin = groupMetadata.participants.some(
                p => p.id === senderId && (p.admin === 'admin' || p.admin === 'superadmin')
            );
            const targetIsAdmin = groupMetadata.participants.some(
                p => p.id === targetId && (p.admin === 'admin' || p.admin === 'superadmin')
            );

            if (!senderIsAdmin) {
                return '❌ Only group admins can use this command.';
            }
            if (!botIsAdmin) {
                return '❌ Bot must be a group admin to kick members.';
            }
            if (targetIsAdmin) {
                return '❌ Cannot kick another admin.';
            }

            await sock.groupParticipantsUpdate(context.chatId, [targetId], 'remove');
            return `✅ Removed @${targetId.split('@')[0]} from the group.`;
        } catch (err) {
            return `❌ Failed to kick user: ${err.message}`;
        }
    },
};
