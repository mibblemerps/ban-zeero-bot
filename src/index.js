import 'dotenv/config';
import {Calendar, Event} from './calendar.js';
import {drawCalendar} from './calendar-draw.js';
import * as PImage from "pureimage";
import * as fs from "node:fs";
import {start} from './discord-bot.js';

console.log('Ban Zeero Bot by Mibble :3');
await start();
