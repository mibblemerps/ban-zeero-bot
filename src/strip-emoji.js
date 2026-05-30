export function strip(str) {
    // Source - https://stackoverflow.com/a/41543705
    // Posted by jony89, modified by community. See post 'Timeline' for change history
    // Retrieved 2026-05-30, License - CC BY-SA 4.0
    return str.replace(/\p{Emoji_Presentation}/gu, '');

}