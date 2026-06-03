import {EmbedBuilder, messageLink, time} from 'discord.js';

/**
 *
 * @param {Event} event
 */
export function generateMeetEmbed(event) {
    return new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(event.name)
        .setDescription(`${time(event.startsAt, 'f')} ${time(event.startsAt, 'R')}`)
        .setURL(messageLink(event.channelId, event.messageId));
}


export function generateMeetEmbeds(events) {
    let embeds = [];
    for (const event of events) {
        embeds.push(generateMeetEmbed(event));
    }
    return embeds;
}