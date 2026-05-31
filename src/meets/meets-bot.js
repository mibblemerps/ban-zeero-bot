import {AttachmentBuilder, Client, EmbedBuilder, Events, MessageFlags} from 'discord.js';
import {Event} from './event.js';
import {drawCalendar} from './calendar.js';
import { setTimeout } from 'node:timers/promises';
import {generateMeetEmbeds} from './meet-list.js';

const APOLLO_BOT_ID = process.env.APOLLO_BOT_ID ?? '475744554910351370';
const EVENT_CHANNEL = process.env.EVENT_CHANNEL;
const CALENDAR_CHANNEL = process.env.CALENDAR_CHANNEL ?? EVENT_CHANNEL;

export class MeetsBot {
    /**
     * @param {Client} client
     */
    constructor(client) {
        this.client = client;

        // If true the calendar will be re-generated momentarily.
        this._needsRefresh = true;

        // This is used to see if any events have changed.
        this._lastEventsJson = null;

        if (client.isReady()) {
            this._ready();
        } else {
            client.once(Events.ClientReady, (readyClient) => this._ready());
        }
    }

    _ready() {
        // Setup discord events
        const handleMessageEvent = (messageEvent) => {
            if (!messageEvent.author || messageEvent.author.id.toString() !== APOLLO_BOT_ID) return;
            if (messageEvent.channelId.toString() !== EVENT_CHANNEL) return;

            this._needsRefresh = true;
        }

        this.client.on(Events.MessageCreate, handleMessageEvent);
        this.client.on(Events.MessageUpdate, (oldMessage, newMessage) => handleMessageEvent(newMessage));
        this.client.on(Events.MessageDelete, handleMessageEvent);

        // Refresh loop
        let month = (new Date()).getMonth();
        let monthChanged = false;
        const _ = (async () => {
            while (true) {
                if (this._needsRefresh || monthChanged) {
                    this._needsRefresh = false;
                    try {
                        await this.doRefresh(monthChanged);
                    } catch (e) {
                        console.error('Failed to refresh calendar.', e);
                    }
                }

                await setTimeout(1000);

                // check if month has changed
                monthChanged = false;
                const newMonth = (new Date()).getMonth();
                if (month !== newMonth) {
                    console.log(`Month changed ${month} -> ${newMonth}`);
                    month = newMonth;
                    monthChanged = true;
                }
            }
        })();
    }

    /**
     * Find events and re-post updated calendar.
     *
     * @param {boolean} force Should force refreshing the calendar even if no events have changed?
     * @return {Promise<void>}
     */
    async doRefresh(force = false){
        const events = await this.getEvents();
        if (!force && !this.hasCalendarChanged(events)) {
            return; // events haven't changed
        }

        console.log('Refreshing calendar...');

        const now = new Date();
        const currentCalendar = await drawCalendar(now.getFullYear(), now.getMonth(), events, {});
        const nextCalendar = await drawCalendar(now.getFullYear(), now.getMonth() + 1, events, {});

        const channel = await this.client.channels.fetch(CALENDAR_CHANNEL);

        // Delete previous bot messages
        console.debug('Deleting previous bot messages...');
        const messages = await channel.messages.fetch({limit: 50});
        for (const message of messages.filter(m => m.author.id === this.client.user.id)) {
            await message[1].delete();
        }

        // Send new meets list
        console.debug('Sending new meets list...')
        const minDate = new Date();
        minDate.setDate(minDate.getDate() - 1);
        await channel.send({
            content: '# :star: Meets List :star:',
            embeds: generateMeetEmbeds(events.filter(e => e.date > minDate)),
            flags: [MessageFlags.SuppressNotifications]
        });

        // Send new calendar
        console.debug('Sending new calendars...');
        await channel.send({
            files: [new AttachmentBuilder(currentCalendar, {name: 'calendar.png'})],
            flags: [MessageFlags.SuppressNotifications]
        });
        await channel.send({
            files: [new AttachmentBuilder(nextCalendar, {name: 'calendar.png'})],
            flags: [MessageFlags.SuppressNotifications]
        });
    }

    /**
     * Find events posted in the events channel.
     *
     * @return {Promise<Event[]>}
     */
    async getEvents() {
        const channel = await this.client.channels.fetch(EVENT_CHANNEL);

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
                const regex = new RegExp('^<t:([\\d]+):F>(?: - <t:([\\d]+):t>)?');
                const match = regex.exec(timeStr);

                const startTime = new Date(parseInt(match[1]) * 1000);
                const endTime = match[2] === undefined ? null : new Date(parseInt(match[2]) * 1000);

                const event = new Event(title, startTime, description);
                event.messageId = message.id;
                event.channelId = EVENT_CHANNEL;
                events.push(event);
            } catch (e) {
                console.log(`Unable to parse Apollo message ${message.id}. It probably wasn't an event message.`);
            }
        }

        return events.sort((a, b) => a.date > b.date ? 1 : (a.date < b.date ? -1 : 0));
    }

    hasCalendarChanged(events) {
        const currentEventsJson = JSON.stringify(events);

        if (this._lastEventsJson === null) {
            this._lastEventsJson = currentEventsJson;
            return true;
        }

        const hasChanged = currentEventsJson !== this._lastEventsJson;
        this._lastEventsJson = currentEventsJson;
        return hasChanged;
    }
}
