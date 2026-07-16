import {EmbedBuilder, messageLink, time} from 'discord.js';

/**
 *
 * @param {Event} event
 */
export function generateMeetEmbed(event) {
    let embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(event.name)
        .setDescription(`${time(event.startsAt, 'f')} ${time(event.startsAt, 'R')}`)
        .setURL(messageLink(event.channelId, event.messageId));

    if (event.isOfficial) {
        embed = embed.setFooter({
            text: 'Official ASSA meet',
            iconURL: 'https://cdn.discordapp.com/splashes/1385594767139672135/6b576a6194c4a3c6bf961673cb93fe78.jpg?size=64'
        })
    } else {
        embed = embed.setFooter({
            text: 'Hosted by ' + event.createdBy
        });
    }

    return embed;
}


export function generateMeetEmbeds(events) {
    let embeds = [];
    for (const event of events) {
        embeds.push(generateMeetEmbed(event));
    }
    return embeds;
}