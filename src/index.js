'use strict';
import {getPeers} from './tracker.js';
import {open, openUTF8} from './torrentParser.js';

const torrent = openUTF8('onk.torrent');

getPeers(torrent, peers => {
  console.log('list of peers: ', peers);
});
