import { Writable } from 'node:stream';

export function createWritableBuffer() {
    const chunks = [];

    const stream = new Writable({
        write(chunk, encoding, callback) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
            callback();
        }
    });

    stream.getBuffer = () => Buffer.concat(chunks);

    return stream;
}