'use strict';

import Buffer from 'buffer';
import torrentParser from './torrentParser';

// Built according to BEM specification
// https://wiki.theory.org/BitTorrentSpecification#Messages

export const buildHandshake = torrent => {
    const buf = Buffer.alloc(68);
    buf.writeUInt8(19, 0);                     // pstrlen
    buf.write('BitTorrent protocol', 1);       // pstr
    buf.writeUInt32BE(0, 20);                  // reserved
    buf.writeUInt32BE(0, 24);                  // reserved
    torrentParser.infoHash(torrent).copy(buf, 28); // info hash
    buf.write(util.genId());                   // peer id
    return buf;
};

export const buildKeepAlive = () => Buffer.alloc(4);

export const buildChoke = () => {
    const buf = Buffer.alloc(5);
    buf.writeUInt32BE(1, 0);                   // length
    buf.writeUInt8(0, 4);                      // id
    return buf;
};

export const buildUnchoke = () => {
    const buf = Buffer.alloc(5);
    buf.writeUInt32BE(1, 0);                   // length
    buf.writeUInt8(1, 4);                      // id
    return buf;
};

export const buildInterested = () => {
    const buf = Buffer.alloc(5);
    buf.writeUInt32BE(1, 0);                   // length
    buf.writeUInt8(2, 4);                      // id
    return buf;
};

export const buildUninterested = () => {
    const buf = Buffer.alloc(5);
    buf.writeUInt32BE(1, 0);                   // length
    buf.writeUInt8(3, 4);                      // id
    return buf;
};

export const buildHave = payload => {
    const buf = Buffer.alloc(9);
    buf.writeUInt32BE(5, 0);                   // length
    buf.writeUInt8(4, 4);                      // id
    buf.writeUInt32BE(payload, 5);             // piece index
    return buf;
};

export const buildBitfield = bitfield => {
    const buf = Buffer.alloc(14);
    buf.writeUInt32BE(payload.length + 1, 0);  // length
    buf.writeUInt8(5, 4);                      // id
    bitfield.copy(buf, 5);                     // bitfield
    return buf;
};

export const buildRequest = payload => {
    const buf = Buffer.alloc(17);
    buf.writeUInt32BE(13, 0);                  // length
    buf.writeUInt8(6, 4);                      // id
    buf.writeUInt32BE(payload.index, 5);       // piece index
    buf.writeUInt32BE(payload.begin, 9);       // begin
    buf.writeUInt32BE(payload.length, 13);     // length
    return buf;
};

export const buildPiece = payload => {
    const buf = Buffer.alloc(payload.block.length + 13);
    buf.writeUInt32BE(payload.block.length + 9, 0); // length
    buf.writeUInt8(7, 4);                      // id
    buf.writeUInt32BE(payload.index, 5);       // piece index
    buf.writeUInt32BE(payload.begin, 9);       // begin
    payload.block.copy(buf, 13);               // block
    return buf;
};

export const buildCancel = payload => {
    const buf = Buffer.alloc(17);
    buf.writeUInt32BE(13, 0);                  // length
    buf.writeUInt8(8, 4);                      // id
    buf.writeUInt32BE(payload.index, 5);       // piece index
    buf.writeUInt32BE(payload.begin, 9);       // begin
    buf.writeUInt32BE(payload.length, 13);     // length
    return buf;
};

export const buildPort = payload => {
    const buf = Buffer.alloc(7);
    buf.writeUInt32BE(3, 0);                   // length
    buf.writeUInt8(9, 4);                      // id
    buf.writeUInt16BE(payload, 5);             // listen-port
    return buf;
};
