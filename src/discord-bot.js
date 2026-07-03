import {Client, Events, GatewayIntentBits, REST, Routes } from 'discord.js';
import {MeetsBot} from "./meets/meets-bot.js";
import {GalleryBot} from "./gallery/gallery-bot.js";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
]});

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Discord bot ready. Logged in as ${readyClient.user.tag}`);
});

const meets = new MeetsBot(client);
const gallery = new GalleryBot(client);

async function deployCommands() {
    console.log('Deploying bot commands...');
    const commands = []
    for (const command of gallery.commands()) {
        commands.push(command.toJSON());
    }

    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(CLIENT_ID), {body: commands});

    console.log('Commands deployed.');
}

export async function start() {
    await client.login(DISCORD_TOKEN);
    await deployCommands();
}
