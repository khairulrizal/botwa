const autoReplyKeywords = {
    'halo': 'Halo! Ada yang bisa saya bantu?',
    'info': 'Ketik !menu untuk melihat perintah yang tersedia',
};

module.exports = {
    name: 'autoreply',
    description: 'Auto-reply system (internal, not a command)',
    keywords: autoReplyKeywords,

    check: (messageText) => {
        const lower = messageText.toLowerCase();
        for (const [keyword, reply] of Object.entries(autoReplyKeywords)) {
            if (lower.includes(keyword)) {
                return reply;
            }
        }
        return null;
    },
};
