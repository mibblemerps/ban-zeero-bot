import {AttachmentBuilder, Client, EmbedBuilder, Events, MessageFlags, ContextMenuCommandBuilder, ApplicationCommandType} from 'discord.js';
import {Event} from './event.js';
import {drawCalendar} from './calendar.js';
import { setTimeout } from 'node:timers/promises';
import {generateMeetEmbeds} from './meet-list.js';
import MeetsArchive from "./meets-archive.js";
import {OfficialMeets} from "./official-meets.js";

const APOLLO_BOT_ID = process.env.APOLLO_BOT_ID ?? '475744554910351370';
const EVENT_CHANNEL = process.env.EVENT_CHANNEL;
const CALENDAR_CHANNEL = process.env.CALENDAR_CHANNEL ?? EVENT_CHANNEL;
const OFFICIAL_MEET_MAKER_ROLE = process.env.OFFICIAL_MEET_MAKER_ROLE;

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

        /**
         * Should the calendar refresh daily and highlight the current day?
         *
         * @type {boolean}
         */
        this.refreshDaily = true;

        this._meetsArchive = new MeetsArchive(process.env.MEETS_ARCHIVE_FILE ?? 'archived-meets.json');

        this._officalMeets = new OfficialMeets(process.env.MEETS_OFFICIAL_FILE ?? 'official-meets.json');

        if (client.isReady()) {
            this._ready();
        } else {
            client.once(Events.ClientReady, (readyClient) => this._ready());
        }
    }

    commands() {
        return [
            new ContextMenuCommandBuilder()
                .setName('Mark event as official')
                .setType(ApplicationCommandType.Message)
        ];
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

        // Handle deleted events: deleted events are archived locally so they can remain on the calendar.
        this.client.on(Events.MessageDelete, async (messageEvent) => {
            if (!messageEvent.author || messageEvent.author.id.toString() !== APOLLO_BOT_ID) return;
            if (messageEvent.channelId.toString() !== EVENT_CHANNEL) return;

            const event = this._parseMessage(messageEvent);
            if (event.startsAt > new Date()) {
                // this event is in the future; we don't archive future events
                return;
            }

            await this._meetsArchive.archive(event);

            this._needsRefresh = true;
        });

        // Commands
        this.client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isMessageContextMenuCommand()) return;

            if (interaction.commandName === 'Mark event as official') {
                await this._markEventOfficialCommand(interaction);
            }
        });

        // Refresh loop
        let month = (new Date()).getMonth();
        let day = (new Date()).getDate();
        let monthChanged = false;
        let dayChanged = false;
        const _ = (async () => {
            while (true) {
                const dayOrMonthChange = monthChanged || (dayChanged && this.refreshDaily);
                if (this._needsRefresh || dayOrMonthChange) {
                    this._needsRefresh = false;
                    try {
                        await this.doRefresh(dayOrMonthChange);
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

                // check if day has changed
                dayChanged = false;
                const newDay = (new Date()).getDate();
                if (day !== newDay) {
                    console.log(`Day changed ${day} -> ${newDay}`);
                    day = newDay;
                    dayChanged = true;
                }
            }
        })();
    }

    /**
     *
     * @param {Interaction} interaction
     * @private
     */
    async _markEventOfficialCommand(interaction) {
        await interaction.deferReply({flags: MessageFlags.Ephemeral});

        if (!interaction.member.roles.cache.some(role => role.id.toString() === OFFICIAL_MEET_MAKER_ROLE)) {
            // no permission!
            await interaction.editReply('⚠️ You don\'t have permission to use this command.', {flags: MessageFlags.Ephemeral});
            return;
        }

        const events = await this.getEvents();
        const meet = events.find(e => e.messageId === interaction.targetMessage.id);
        if (!meet) {
            await interaction.editReply('⚠️ Not a valid meet.', {flags: MessageFlags.Ephemeral});
            return;
        }

        const isOfficial = this._officalMeets.isMeetOfficial(meet);
        if (isOfficial) {
            await this._officalMeets.setMeet(meet, false);
            await interaction.editReply('✅ Meet has been marked *un-official*.', {flags: MessageFlags.Ephemeral});
        } else {
            await this._officalMeets.setMeet(meet, true);
            await interaction.editReply('✅ Meet has been marked as *official*.', {flags: MessageFlags.Ephemeral});
        }

        this._needsRefresh = true;
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
        const currentCalendar = await drawCalendar(now.getFullYear(), now.getMonth(), events, {
            shouldHighlightToday: this.refreshDaily,
        });
        const nextCalendar = await drawCalendar(now.getFullYear(), now.getMonth() + 1, events, {
            shouldHighlightToday: this.refreshDaily,
        });

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
            embeds: generateMeetEmbeds(events.filter(e => e.startsAt > minDate)),
            flags: [MessageFlags.SuppressNotifications]
        });

        // Community event message
        await channel.send({
            content: '> Want to host an event? Open a ticket in <#1385609657908858900> for the meet maker role!',
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
        let events = [];

        // Load events from events channel
        const channel = await this.client.channels.fetch(EVENT_CHANNEL);
        const messages = await channel.messages.fetch({
            limit: 100,
            cache: false,
        });
        for (let messageData of messages) {
            const message = this._parseMessage(messageData[1]);
            if (message !== null) {
                events.push(message);
            }
        }

        // Load any archived events
        for (const archivedEvent of this._meetsArchive.events) {
            events.push(archivedEvent);
        }

        return events.sort((a, b) => a.startsAt > b.startsAt ? 1 : (a.startsAt < b.startsAt ? -1 : 0));
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

    _parseMessage(message) {
        try {
            if (message.author.id.toString() !== APOLLO_BOT_ID) return null;

            const title = message.embeds[0].title;
            const description = message.embeds[0].description;
            const createdBy = message.embeds[0].footer;

            const timeStr = message.embeds[0].fields[0].value;
            const regex = new RegExp(/^<t:([\d]+):[a-z]>(?: - <t:([\d]+):[a-z]>)?/i);
            const match = regex.exec(timeStr);

            const startTime = new Date(parseInt(match[1]) * 1000);
            const endTime = match[2] === undefined ? null : new Date(parseInt(match[2]) * 1000);

            const event = new Event();
            event.name = title;
            event.startsAt = startTime;
            event.endsAt = endTime;
            event.description = description;
            event.createdBy = createdBy.text
                .replace('Multiple signups are permitted', '')
                .replace('Created by', '').trim();
            event.messageId = message.id;
            event.channelId = EVENT_CHANNEL;
            event.isOfficial = this._officalMeets.isMeetOfficial(event);
            return event;
        } catch (e) {
            console.log(`Unable to parse Apollo message ${message.id}. It probably wasn't an event message.`);
            return null;
        }
    }
}
