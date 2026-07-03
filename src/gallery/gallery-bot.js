import {SlashCommandBuilder, Client, EmbedBuilder, Events, MessageFlags, GuildMember} from 'discord.js';
import axios from "axios";

const WEBSITE = process.env.WEBSITE;
const WEBSITE_API_KEY = process.env.WEBSITE_API_KEY;

export class GalleryBot {
    /**
     * @param {Client} client
     */
    constructor(client) {
        this.client = client;
        this.permittedRoles = (process.env.GALLERY_ROLES ?? '').split(' ');

        if (client.isReady()) {
            this._ready();
        } else {
            client.once(Events.ClientReady, (readyClient) => this._ready());
        }
    }

    /**
     * Makes a request to the website for an upload link for a given discord user.
     *
     * @param {GuildMember} user
     * @return {Promise<string>} Upload link
     */
    async access(user) {
        const res = await axios.post(WEBSITE + '/api/access', {
            id: user.id.toString(),
            name: user.displayName,
            avatar: user.displayAvatarURL() ?? 'https://cdn.discordapp.com/embed/avatars/0.png'
        }, {
            headers: {
                Authorization: `Bearer ${WEBSITE_API_KEY}`
            }
        });

        return res.data.link;
    }

    /**
     * Send server statistics to the website.
     *
     * @return {Promise<void>}
     */
    async sendStatistics() {
        console.log('Sending statistics...');
        const guild = this.client.guilds.cache.first();
        if (!guild) return;
        console.log('Sending statistics for ' + guild.name);

        await axios.post(WEBSITE + '/api/statistics', {
            memberCount: guild.memberCount,
        }, {
            headers: {
                Authorization: `Bearer ${WEBSITE_API_KEY}`
            },
            timeout: 5000
        });

        console.log('Sent statistics');
    }

    commands() {
        return [
            new SlashCommandBuilder()
                .setName('photoupload')
                .setDescription('Upload photos to the Anthros SA website')
        ];
    }

    async photoUploadCommand(interaction) {
        if (!interaction.member.roles.cache.some(role => this.permittedRoles.includes(role.id))) {
            // no permission!
            await interaction.reply('⚠️ You don\'t have permission to use this command.', {flags: MessageFlags.Ephemeral});
            return;
        }

        await interaction.deferReply({flags: MessageFlags.Ephemeral});

        console.log('Fetching OTP link for ' + interaction.member.displayName + '...');
        let link;
        try {
            link = await this.access(interaction.member);
            await interaction.editReply(link);
        } catch (e) {
            console.warn(`Failed to fetch OTP link for ${interaction.member}: ${e.message}`);
            await interaction.editReply('⚠️ Failed to access photo gallery. Please try again later.');
        }
    }

    _ready() {
        this.client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isChatInputCommand()) return;

            if (interaction.commandName === 'photoupload') {
                await this.photoUploadCommand(interaction);
            }
        });

        this.sendStatistics();

        setInterval(async () => {
            try {
                await this.sendStatistics();
            } catch (e) {
                console.warn('Send statistics failed', e);
            }
        }, 60 * 1000);
    }
}
