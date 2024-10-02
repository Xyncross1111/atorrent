'use strict';
import {getPeers} from './src/tracker.js';
import {open, openUTF8} from './src/torrentParser.js';

const torrent = open('onk.torrent');

getPeers(torrent, peers => {
  console.log('list of peers: ', peers);
});
