const { Module } = require('../main');
const axios = require('axios');

Module({
    pattern: 'gen ?(.*)',
    desc: 'Generate an image using the API. All types supported!',
    use: 'ai',
    usage: 'gen <prompt>',
    warn: 'This command relies on an external API and may not always be available.'
}, async (message, match) => {
    const prompt = match[1];
    if (!prompt) return message.sendReply('_Please provide a prompt for image generation._');

    const apiUrl = `https://jerrycoder.wwiw.uz/img?p=${encodeURIComponent(prompt)}`;

    try {
        const initialMessage = await message.sendReply('_Generating image... Please wait._');

        const response = await axios.get(apiUrl);
        if (!response.data || !response.data.success || !response.data.url) {
            return message.edit('_Failed to get a valid image from the API._', message.jid, initialMessage.key);
        }

        const imageUrl = response.data.url;

        await message.sendMessage({ url: imageUrl }, 'image', {
            caption: `_Image generated for prompt:_\n_${prompt}_`
        });

        await message.edit('_Image sent._', message.jid, initialMessage.key);
    } catch (e) {
        console.error(e);
        if (e.response && e.response.status === 404) {
            return message.sendReply('_Failed to generate image. The API could not find results or is temporarily unavailable._');
        }
        await message.sendReply('_An error occurred while generating the image. Please try again later._');
    }
});
