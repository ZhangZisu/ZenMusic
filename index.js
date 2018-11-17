const API = 'https://api.i-meto.com/meting/api?server=:server&type=:type&id=:id&r=:r';
const axios = require('axios');
const fse = require('fs-extra');
const path = require('path');
const ProgressBar = require('progress');
const sanitize = require('sanitize-filename');
const prompt = require('async-prompt');
const https = require("https");

const instance = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    })
});

const supported_servers = ['netease', 'tencent', 'kugou', 'xiami', 'baidu'];
const supported_types = ['song', 'playlist', 'album', 'search', 'artist'];
/**
 * build meting API url
 * @param {String} server music server(netease, tencent, kugou, xiami, baidu)
 * @param {String} type music type (song, playlist, album, search, artist)
 * @param {String} id song/playlist/album/artist ID or search keyword
 * @returns {String} the meting API url
 */
function buildURL(server, type, id) {
    if (!supported_servers.includes(server)) throw new Error('Server not support');
    if (!supported_types.includes(type)) throw new Error('Type not support');
    let url = API;
    url = url.replace(':server', server);
    url = url.replace(':type', type);
    url = url.replace(':id', id);
    url = url.replace(':r', Math.random());
    return url;
}

const download = async (url, path) => {
    const response = await instance.get(url, { responseType: 'stream' });
    // pipe the result stream into a file on disc
    response.data.pipe(fse.createWriteStream(path));

    // return a promise and resolve when download finishes
    return new Promise((resolve, reject) => {
        response.data.on('end', () => {
            resolve();
        });
        response.data.on('error', () => {
            reject();
        });
    });
};

const main = async () => {
    const MUSIC_SERVER = await prompt('Server: ');
    const MUSIC_TYPE = await prompt('Type  : ');
    const MUSIC_ID = await prompt('ID    : ');
    const DOWNLOAD_DIR = path.join(MUSIC_TYPE, MUSIC_SERVER, MUSIC_ID);
    await fse.ensureDir(DOWNLOAD_DIR);

    let url = buildURL(MUSIC_SERVER, MUSIC_TYPE, MUSIC_ID);
    console.info(`API URL: ${url}`);
    let result = await instance.get(url);
    if (result.data && result.data instanceof Array) {
        console.info(`Found ${result.data.length} result(s)`);
        const bar = new ProgressBar(':bar :current :total :percent :eta :songname', { total: result.data.length, width: 50 });
        for (let song of result.data) {
            let filename = sanitize(`${song.name} - ${song.artist}`, { replacement: '_' });
            await download(song.url, path.join(DOWNLOAD_DIR, filename + '.mp3'));
            await download(song.lrc, path.join(DOWNLOAD_DIR, filename + '.lrc'));
            await download(song.cover, path.join(DOWNLOAD_DIR, filename + '.jpg'));
            bar.tick({ songname: filename });
        }
    } else {
        console.log('Failed.');
    }
}

main().then(() => process.exit(0)).catch(e => console.log(e.message));