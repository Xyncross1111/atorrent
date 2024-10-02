'use strict';
import { getPeers } from './src/tracker.js';
import download from './src/download.js';
import { open } from './src/torrentParser.js';

const torrent = open('onk.torrent');

download(torrent);
