import * as fs from "node:fs/promises";
import {Event} from "./event.js";

export default class MeetsArchive {
    /**
     *
     * @param {string} file Path to archive file
     */
    constructor(file) {
        this.file = file;

        /**
         * @type {Event[]|null}
         */
        this.events = [];

        this._init();
    }

    async archive(event) {
        this.events.push(event);
        await this._save();
    }

    async _init() {
        // Create file if it doesn't exist
        try {
            await fs.access(this.file, fs.constants.F_OK);
        } catch (e) {
            await fs.writeFile(this.file, '[]');
        }

        try {
            const eventsData = JSON.parse(await fs.readFile(this.file, 'utf8'));
            this.events.length = 0; // empty existing events array
            for (const eventData of eventsData) {
                const event = new Event();
                event.name = eventData.name;
                event.description = eventData.description;
                event.startsAt = eventData.startsAt === null ? null : new Date(eventData.startsAt);
                event.endsAt = eventData.endsAt === null ? null : new Date(eventData.endsAt);
                event.createdBy = (typeof(eventData.createdBy) === 'object') ? eventData.createdBy.text.replace('Multiple signups are permitted', '').replace('Created by', '').trim() : eventData.createdBy;
                event.channelId = eventData.channelId;
                event.messageId = eventData.messageId;
                event.isOfficial = eventData.isOfficial ?? false;

                this.events.push(event);
            }
        } catch (e) {
            console.error('Failed to load archived events', e);
        }
    }

    async _save() {
        try {
            await fs.writeFile(this.file, JSON.stringify(this.events));
        } catch (e) {
            console.error('Failed to save archived events', e);
        }
    }
}
