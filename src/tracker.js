'use strict';

import dgram from 'dgram';
import { Buffer } from 'buffer';
import { URL } from 'url';
import crypto from 'crypto';

import torrentParser from './torrentParser.js';
import genId from './util.js';

export const getPeers = (torrent, callback) => {
    const socket = dgram.createSocket('udp4');
    const url = torrent.announce.toString();

    // 1. send connect request
    udpSend(socket, buildConnReq(), url);

    socket.on('message', response => {

        console.log('response', response);
        if (respType(response) === 'connect') {

            // 2. receive and parse connect response

            const connResp = parseConnResp(response);

            // 3. send announce request
            const announceReq = buildAnnounceReq(connResp.connectionId, torrent);
            udpSend(socket, announceReq, url);

        } else if (respType(response) === 'announce') {

            // 4. parse announce response
            const announceResp = parseAnnounceResp(response);
            // 5. pass peers to callback
            callback(announceResp.peers);
        }
    });
};

const udpSend = (socket, message, rawUrl, callback = () => { }) => {

    const test = 'udp://tracker.opentrackr.org:1337/announce'
    const url = new URL(test);
    socket.send(message, 0, message.length, url.port, url.hostname, (err) => {
        if (err) {
            console.error(`Error sending message: ${err}`);
            socket.close();
            return;
        }
        console.log(`Sent`);
    });
};

const respType = (resp) => {
    const action = resp.readUInt32BE(0);
    if (action === 0) return 'connect';
    if (action === 1) return 'announce';
};

const buildConnReq = () => {

    const connectionBuffer = Buffer.alloc(16);

    // connection id
    // JS does not let us write direcly for a 65 bit integer. hence we write in two parts
    // 0x41727101980 is permanent connection_id

    connectionBuffer.writeUInt32BE(0x417, 0);
    connectionBuffer.writeUInt32BE(0x27101980, 4);

    // action
    connectionBuffer.writeUInt32BE(0, 8);

    // transaction id
    crypto.randomBytes(4).copy(connectionBuffer, 12);

    return connectionBuffer;
};

const parseConnResp = (resp) => {
    return {
        action: resp.readUInt32BE(0),
        transactionId: resp.readUInt32BE(4),
        connectionId: resp.slice(8)
    }
};

const buildAnnounceReq = (connId, torrent, port=6881) => {
    const announceBuffer = Buffer.allocUnsafe(98);

    // Offset  Size    Name    Value
    // 0       64-bit integer  connection_id
    // 8       32-bit integer  action          1 // announce
    // 12      32-bit integer  transaction_id
    // 16      20-byte string  info_hash
    // 36      20-byte string  peer_id
    // 56      64-bit integer  downloaded
    // 64      64-bit integer  left
    // 72      64-bit integer  uploaded
    // 80      32-bit integer  event           0 // 0: none; 1: completed; 2: started; 3: stopped
    // 84      32-bit integer  IP address      0 // default
    // 88      32-bit integer  key             ? // random
    // 92      32-bit integer  num_want        -1 // default
    // 96      16-bit integer  port            ? // should be betwee
    // 98

    // connection id
    connId.copy(announceBuffer, 0);
    // action
    announceBuffer.writeUInt32BE(1, 8);
    // transaction id
    crypto.randomBytes(4).copy(announceBuffer, 12);
    // info hash
    torrentParser.infoHash(torrent).copy(announceBuffer, 16);
    // peerId
    genId().copy(announceBuffer, 36);
    // downloaded
    Buffer.alloc(8).copy(announceBuffer, 56);
    // left
    torrentParser.size(torrent).copy(announceBuffer, 64);
    // uploaded
    Buffer.alloc(8).copy(announceBuffer, 72);
    // event
    announceBuffer.writeUInt32BE(0, 80);
    // ip address
    announceBuffer.writeUInt32BE(0, 80);
    // key
    crypto.randomBytes(4).copy(announceBuffer, 88);
    // num want
    announceBuffer.writeInt32BE(-1, 92);
    // port
    announceBuffer.writeUInt16BE(port, 96);

    return announceBuffer;
};

const parseAnnounceResp = (resp) => {

    // Offset      Size            Name            Value
    // 0           32-bit integer  action          1 // announce
    // 4           32-bit integer  transaction_id
    // 8           32-bit integer  interval
    // 12          32-bit integer  leechers
    // 16          32-bit integer  seeders
    // 20 + 6 * n  32-bit integer  IP address
    // 24 + 6 * n  16-bit integer  TCP port
    // 20 + 6 * N

    const group = (iterable, groupSize) => {
        let groups = [];
        for (let i = 0; i < iterable.length; i += groupSize) {
            groups.push(iterable.slice(i, i + groupSize));
        }
        return groups;
    }

    return {
        action: resp.readUInt32BE(0),
        transactionId: resp.readUInt32BE(4),
        leechers: resp.readUInt32BE(8),
        seeders: resp.readUInt32BE(12),
        peers: group(resp.slice(20), 6).map(address => {
            return {
                ip: address.slice(0, 4).join('.'),
                port: address.readUInt16BE(4)
            }
        })
    }
};