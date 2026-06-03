import {strip} from "../strip-emoji.js";

export class Event {
    /**
     *
     * @param {string} name
     * @param {Date} startsAt
     * @param {Date} endsAt
     * @param {string} description
     */
    constructor(name, startsAt, endsAt, description) {
        this.name = name;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
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

