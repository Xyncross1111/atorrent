'use strict';

import fs from 'fs';
import bencode from 'bencode';
import crypto from 'crypto';

export const open = (filepath) => {
    return bencode.decode(fs.readFileSync(filepath));
};

export const openUTF8 = (filepath) => {
    return bencode.decode(fs.readFileSync(filepath), 'utf8');
};

export const size = (torrent) => {
    const size = torrent.info.files ?
    torrent.info.files.map(file => file.length).reduce((a, b) => a + b) :
    torrent.info.length;

    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(size));
    return buffer;
};

export const infoHash = torrent => {
    const info = bencode.encode(torrent.info);
    return crypto.createHash('sha1').update(info).digest();
};


export default { open, openUTF8, size, infoHash };