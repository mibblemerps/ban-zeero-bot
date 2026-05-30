import {AttachmentBuilder, Client, Events, GatewayIntentBits, MessageFlags} from 'discord.js';
import {Event} from "./calendar.js";
import {drawCalendar} from "./calendar-draw.js";
import { setTimeout } from 'node:timers/promises';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const APOLLO_BOT_ID = process.env.APOLLO_BOT_ID ?? '475744554910351370';
const EVENT_CHANNEL = process.env.EVENT_CHANNEL;
const CALENDAR_CHANNEL = process.env.CALENDAR_CHANNEL ?? EVENT_CHANNEL;

// If true the calendar will be re-generated momentarily.
let doesCalendarNeedRefresh = false;

// This is used to see if any events have changed.
let lastEventsJson = null;
let lastCalendarMonthIndex = null;

const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
]});

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Discord bot ready. Logged in as ${readyClient.user.tag}`);

    doesCalendarNeedRefresh = true;
});

async function handleMessageEvent(messageEvent) {
    if (!messageEvent.author || messageEvent.author.id.toString() !== APOLLO_BOT_ID) return;
    if (messageEvent.channelId.toString() !== EVENT_CHANNEL) return;

    doesCalendarNeedRefresh = true;
}

client.on(Events.MessageCreate, handleMessageEvent);
client.on(Events.MessageUpdate, (oldMessage, newMessage) => handleMessageEvent(newMessage));
client.on(Events.MessageDelete, handleMessageEvent);

/**
 * Find events and re-post updated calendar.
 *
 * @return {Promise<void>}
 */
async function doRefresh(){
    const events = await getEvents();
    if (!hasCalendarChanged(events)) {
        return; // events haven't changed
    }

    const now = new Date();
    const image = await drawCalendar(now.getFullYear(), now.getMonth(), events, {});

    const channel = await client.channels.fetch(CALENDAR_CHANNEL);

    // Delete previous calendars
    const messages = await channel.messages.fetch({limit: 50});
    for (const message of messages.filter(m => m.author.id === client.user.id)) {
        await message[1].delete();
    }

    // Send new calendar
    const attachment = new AttachmentBuilder(image, {name: 'calendar.png'});
    await channel.send({
        files: [attachment],
        flags: [MessageFlags.SuppressNotifications]
    });
}

/**
 * Find events posted in the events channel.
 *
 * @return {Promise<Event[]>}
 */
async function getEvents() {
    const channel = await client.channels.fetch(EVENT_CHANNEL);

    const messages = await channel.messages.fetch({
        limit: 100,
        cache: false,
    });

    let events = [];

    for (let messageData of messages) {
        const message = messageData[1];
        try {
            if (message.author.id.toString() !== APOLLO_BOT_ID) continue;

            const title = message.embeds[0].title;
            const description = message.embeds[0].description;
            const createdBy = message.embeds[0].footer;

            const timeStr = message.embeds[0].fields[0].value;
            const regex = new RegExp('^<t:([\\d]+):F> - <t:([\\d]+):t>');
            const match = regex.exec(timeStr);

            const startTime = new Date(parseInt(match[1]) * 1000);
            const endTime = new Date(parseInt(match[2]) * 1000);

            const event = new Event(title, startTime);
            events.push(event);
        } catch (e) {
            // failed to process message, presumably it wasn't an event message so we just ignore
        }
    }

    return events;
}

function hasCalendarChanged(events) {
    const currentEventsJson = JSON.stringify(events);
    const currentMonthIndex = (new Date()).getMonth();

    if (lastEventsJson === null) {
        lastEventsJson = currentEventsJson;
        lastCalendarMonthIndex = currentMonthIndex;
        return true;
    }

    if (lastCalendarMonthIndex === null || currentMonthIndex !== lastCalendarMonthIndex) {
        lastEventsJson = currentEventsJson;
        lastCalendarMonthIndex = currentMonthIndex;
        return true;
    }

    const hasChanged = currentEventsJson !== lastEventsJson;
    lastEventsJson = currentEventsJson;
    return hasChanged;
}

export async function start() {
    await client.login(DISCORD_TOKEN);

    // Refresh loop
    const _ = (async function() {
        while (true) {
            if (doesCalendarNeedRefresh) {
                doesCalendarNeedRefresh = false;
                try {
                    await doRefresh();
                } catch (e) {
                    console.error('Failed to refresh calendar.', e);
                }
            }

            await setTimeout(1000);
        }
    })();
}
