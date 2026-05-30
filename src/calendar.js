import {strip} from "./strip-emoji.js";

export class Calendar {
    constructor() {
        /**
         * @type {Event[]}
         */
        this.events = [];
    }
}

export class Event {
    /**
     *
     * @param {string} name
     * @param {Date} date
     * @param {string} description
     */
    constructor(name, date, description) {
        this.name = name;
        this.date = date;
        this.description = description;
        this.messageId = null;
        this.channelId = null;
    }

    get simpleName() {
        return strip(this.name)
            .trim()
            .replace(/^anthros sa ?[-@:]? /i, '')
            .trim();
    }
}

