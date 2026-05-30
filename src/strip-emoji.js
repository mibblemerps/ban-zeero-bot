export function strip(str) {
    // Source - https://stackoverflow.com/a/41543705
    // Posted by jony89, modified by community. See post 'Timeline' for change history
    // Retrieved 2026-05-30, License - CC BY-SA 4.0
    return str.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');

}