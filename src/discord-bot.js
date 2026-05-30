import {Client, Events, GatewayIntentBits} from 'discord.js';
import {MeetsBot} from "./meets/meets-bot.js";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
]});

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Discord bot ready. Logged in as ${readyClient.user.tag}`);
});

const meets = new MeetsBot(client);

export async function start() {
    await client.login(DISCORD_TOKEN);
}
