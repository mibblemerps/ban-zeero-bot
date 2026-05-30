import {Calendar, Event} from './calendar.js';
import * as PImage from 'pureimage';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import textWrap from "./text-wrap.js";
import * as fs from "node:fs";
import {createWritableBuffer} from "./writable-buffer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

PImage.registerFont(path.join(__dirname, '../fonts', 'OpenSans-Light.ttf'), 'opensans-light').loadSync();
PImage.registerFont(path.join(__dirname, '../fonts', 'OpenSans-Regular.ttf'), 'opensans').loadSync();
PImage.registerFont(path.join(__dirname, '../fonts', 'OpenSans-Bold.ttf'), 'opensans-bold').loadSync();

const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
];

/**
 * @param {number} year
 * @param {number} monthIndex Month index (0 = Jan)
 * @param {Event[]} events
 * @param canvasWidth
 * @param canvasHeight
 * @param calendarWidth
 * @param calendarHeight
 * @param calendarX
 * @param calendarY
 * @param lineColor
 * @param lineWidth
 * @param dayTextColor
 * @param otherDayTextColor
 * @param dayBackColor
 * @param otherDayBackColor
 */
export async function drawCalendar(year, monthIndex, events, {
    canvasWidth = 1920,
    canvasHeight = 1500,
    calendarWidth = 1920,
    calendarHeight = 1160,
    calendarX = 0,
    calendarY = 340,
    headerY = 292,
    headerHeight = 50,
    lineColor = '#333333',
    lineWidth = 5,
    dayTextColor = '#000000',
    otherDayTextColor = '#707070',
    dayBackColor = '#fff',
    otherDayBackColor = '#cdcdcd',
    monthTextX = 1890,
    monthTextY = 180,
    monthTextColor = '#fff',
    monthFont = '80px opensans-bold',
}) {
    const img = PImage.make(canvasWidth, canvasHeight);
    const c = img.getContext('2d');
    c.fillStyle = '#ffffff';
    c.fillRect(calendarX, calendarY, calendarWidth, calendarHeight);

    // Draw header image
    const headerImg = await PImage.decodePNGFromStream(fs.createReadStream(path.join(__dirname, '../img/header.png')));
    c.drawImage(headerImg, 0, 0);

    // Draw header
    drawHeader(calendarX, headerY, calendarWidth, headerHeight);

    // Draw month name
    c.textBaseline = 'top';
    c.fillStyle = monthTextColor;
    c.font = monthFont;
    c.textAlign = 'end';
    c.fillText(months[monthIndex] + ' ' + year.toString(), monthTextX, monthTextY);

    function drawHeader(x, y, width, height) {
        const xStep = Math.round(calendarWidth / 7);

        for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
            c.fillStyle = lineColor;
            c.fillRect(x, y, xStep, y);

            // Day text
            c.font = '40px opensans-bold';
            c.textAlign = 'center';
            c.fillStyle = '#fff';
            c.textBaseline = 'top';
            c.fillText(day.toString(), x + (xStep / 2), y);

            // Border
            c.strokeStyle = lineColor;
            c.lineWidth = lineWidth;
            c.beginPath();
            c.rect(x, y, width, height);
            c.stroke();

            x += xStep;
        }
    }

    function drawDay(dayMonthIndex, day, x, y, width, height, grayOut = false) {
        // draw bg
        c.fillStyle = grayOut ? otherDayBackColor : dayBackColor;
        c.fillRect(x, y, width, height);

        // draw day number
        c.font = '40px opensans-bold';
        c.textAlign = 'start';
        c.fillStyle = grayOut ? otherDayTextColor : dayTextColor;
        c.textBaseline = 'top';
        c.fillText(day.toString(), x + 10, y + 10);

        // Border
        c.strokeStyle = lineColor;
        c.lineWidth = lineWidth;
        c.beginPath();
        c.rect(x, y, width, height);
        c.stroke();

        const dayEvents = events.filter(e => e.date.getMonth() === dayMonthIndex && e.date.getDate() === day);
        if (dayEvents.length === 1) {
            c.font = '30px opensans';
            textWrap(c, dayEvents[0].name, x + 10, y + 55, width - 30, 30, 4);
        }
        else if (dayEvents.length > 1) {
            c.font = '30px opensans';
            textWrap(c, dayEvents[0].name, x + 10, y + 55, width - 30, 30, 1);
            textWrap(c, dayEvents[1].name, x + 10, y + 100, width - 30, 30, 1);

            if (dayEvents.length > 2) {
                c.textAlign = 'end';
                c.fillText('+ ' + (dayEvents.length - 2) + ' more...', x + width - 10, y + 140);
            }
        }
    }

    function drawMonth(monthIndex) {
        // get starting day of week (0 = Monday)
        let monthStartingDayOfWeek = new Date(year, monthIndex, 1).getDay() - 1;
        if (monthStartingDayOfWeek === -1) monthStartingDayOfWeek = 6;

        // gets days in this month
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

        const xStep = Math.round(calendarWidth / 7);
        const yStep = Math.round(calendarHeight / 6);

        let index = monthStartingDayOfWeek;
        for (let day = 1; day <= daysInMonth; day++) {
            let x = (index % 7) * xStep;
            let y = Math.floor(index / 7) * yStep;

            drawDay(monthIndex, day, calendarX + x, calendarY + y, xStep, yStep);

            index++;
        }
        const lastIndex = index;

        // Draw previous month
        let day = new Date(year, monthIndex, 0).getDate();
        for (let index = monthStartingDayOfWeek - 1; index >= 0; index--) {
            let x = (index % 7) * xStep;
            let y = Math.floor(index / 7) * yStep;

            drawDay(monthIndex - 1, day--, calendarX + x, calendarY + y, xStep, yStep, true);
        }

        // Draw next month
        day = 1;
        for (let index = lastIndex; index <= 7 * 6; index++) {
            let x = (index % 7) * xStep;
            let y = Math.floor(index / 7) * yStep;

            drawDay(monthIndex + 1, day++, calendarX + x, calendarY + y, xStep, yStep, true);
        }
    }

    drawMonth(monthIndex);

    const buffer = createWritableBuffer();
    await PImage.encodePNGToStream(img, buffer);
    return buffer.getBuffer();
}