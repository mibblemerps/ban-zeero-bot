import * as fs from "node:fs/promises";

export class OfficialMeets {
    constructor(file) {
        this.file = file;
        this.officialMeetMessageIds = [];

        this.init();
    }

    async init() {
        try {
            this.officialMeetMessageIds = JSON.parse(await fs.readFile(this.file, 'utf8'));
        } catch (e) {
            console.error('Error loading official meets!', e);
        }
    }

    /**
     * @param {Event} meet
     * @return {boolean}
     */
    isMeetOfficial(meet) {
        return this.officialMeetMessageIds.includes(meet.messageId.toString());
    }

    /**
     *
     * @param {Event} meet
     * @param {boolean} official
     */
    async setMeet(meet, official) {
        if (official) {
            this.officialMeetMessageIds.push(meet.messageId);
        } else {
            this.officialMeetMessageIds.splice(this.officialMeetMessageIds.indexOf(meet.messageId), 1);
        }

        await this._save();
    }

    async _save() {
        try {
            await fs.writeFile(this.file, JSON.stringify(this.officialMeetMessageIds, null, 2));
        } catch (e) {
            console.error('Error saving official meets!', e);
        }
    }
}
