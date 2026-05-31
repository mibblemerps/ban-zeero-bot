import {strip} from "../strip-emoji.js";

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
            .replace(/^anthros sa ?[-@:] /i, '')
            .replace(/:[a-z]+:/ig, '')
            .trim();
    }
}

