import {strip} from "../strip-emoji.js";

export class Event {
    constructor() {
        /**
         * @type {string|null}
         */
        this.name = null;

        /**
         * @type {Date|null}
         */
        this.startsAt = null;

        /**
         * @type {Date|null}
         */
        this.endsAt = null;

        /**
         * @type {string|null}
         */
        this.description = null;

        /**
         * @type {string|null}
         */
        this.createdBy = null;

        /**
         * @type {string|null}
         */
        this.messageId = null;

        /**
         * @type {string|null}
         */
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

