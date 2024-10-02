'use strict';

import dgram from 'dgram';
import { Buffer } from 'buffer';
import { URL } from 'url';
import crypto from 'crypto';

import torrentParser from './torrentParser.js';
import genId from './util.js';

export const getPeers = (torrent, callback) => {
    const socket = dgram.createSocket('udp4');
    socket.setMaxListeners(50);

    // let trackerList = torrent["announce-list"].flat();

    const trackerList = ['udp://tracker.opentrackr.org:1337/announce'];

    trackerList.forEach((url) => {
        udpSend(socket, buildConnReq(), url);

        // avoid memory leak warning
        socket.on('message', response => {

            if (respType(response) === 'connect') {

                const connResp = parseConnResp(response);

                const announceReq = buildAnnounceReq(connResp.connectionId, torrent);
                udpSend(socket, announceReq, url);

            } else if (respType(response) === 'announce') {

                const announceResp = parseAnnounceResp(response);
                console.log(`Parsed announce response: ${JSON.stringify(announceResp)}`);

                callback(announceResp.peers);
            }
        });
    });

};

const udpSend = (socket, message, rawUrl, callback = () => { }) => {

    const url = new URL(rawUrl);

    if (url.protocol !== 'udp:') {
        console.error(`Unsupported protocol: ${url}`);
        return;
    }

    if (url.port === null) url.port = 80;

    socket.send(message, 0, message.length, url.port, url.hostname, (err) => {

        if (err) console.error(`Error sending message: ${err}`);
        else console.log(`Sent to ${url.hostname}:${url.port}`);
        callback(err);
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

const buildAnnounceReq = (connId, torrent, port = 6881) => {
    const announceReq = Buffer.allocUnsafe(98);

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

    connId.copy(announceReq, 0);                           // connection id
    announceReq.writeUInt32BE(1, 8);                       // action
    crypto.randomBytes(4).copy(announceReq, 12);           // transaction id
    torrentParser.infoHash(torrent).copy(announceReq, 16); // info hash     
    genId().copy(announceReq, 36);                         // peerId   
    announceReq.writeBigUInt64BE(0n, 56);                  // Downloaded 
    torrentParser.size(torrent).copy(announceReq, 64);     // left   
    announceReq.writeBigUInt64BE(0n, 72);                  // uploaded
    announceReq.writeUInt32BE(0, 80);                      // event
    announceReq.writeUInt32BE(0, 84);                      // ip address
    crypto.randomBytes(4).copy(announceReq, 88);           // key
    announceReq.writeInt32BE(-1, 92);                      // num want
    announceReq.writeUInt16BE(port, 96);                   // port
    
    return announceReq;
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