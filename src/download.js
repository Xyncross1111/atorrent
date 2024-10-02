'use strict';

import net from 'net';
import { getPeers } from './tracker.js';

export default fn = torrent => {
    getPeers(torrent, peers => {
        peers.forEach(download);
    });
};

const download = peer => {
    const socket = new net.Socket();
    socket.on('error', console.log);
    socket.connect(peer.port, peer.ip, () => {
        // socket.write(...) write a message here
    });
    socket.on('data', data => {
        // handle response here
    });
}