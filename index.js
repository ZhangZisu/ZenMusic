const API = 'https://api.i-meto.com/meting/api?server=:server&type=:type&id=:id&r=:r';
const axios = require('axios');
const download = require('download');
const fse = require('fs-extra');
const path = require('path');
const ProgressBar = require('progress');
const sanitize = require("sanitize-filename");

/**
 * build meting API url
 * @param {String} server music server(netease, tencent, kugou, xiami, baidu)
 * @param {String} type music type (song, playlist, album, search, artist)
 * @param {String} id song/playlist/album/artist ID or search keyword
 * @returns {String} the meting API url
 */
function buildURL(server, type, id) {
    let url = API;
    url = url.replace(":server", server);
    url = url.replace(":type", type);
    url = url.replace(":id", id);
    url = url.replace(":r", Math.random());
    return url;
}

const main = async () => {
    const MUSIC_SERVER = 'netease';
    const MUSIC_TYPE = 'playlist';
    const MUSIC_ID = '312194477';
    const DOWNLOAD_DIR = path.join(MUSIC_TYPE, MUSIC_SERVER, MUSIC_ID);
    await fse.ensureDir(DOWNLOAD_DIR);

    let url = buildURL(MUSIC_SERVER, MUSIC_TYPE, MUSIC_ID);
    console.info(`API URL: ${url}`);
    let result = await axios.get(url);
    if (result.data && result.data instanceof Array) {
        console.info(`Found ${result.data.length} result(s)`);
        const bar = new ProgressBar(':bar :current :total :percent :eta :songname', { total: result.data.length, width: 50 });
        for (let song of result.data) {
            let filename = sanitize(`${song.name} - ${song.artist}`, { replacement: '_' });
            await fse.writeFile(path.join(DOWNLOAD_DIR, filename + '.mp3'), await download(song.url));
            await fse.writeFile(path.join(DOWNLOAD_DIR, filename + '.lrc'), await download(song.lrc));
            await fse.writeFile(path.join(DOWNLOAD_DIR, filename + '.jpg'), await download(song.cover));
            bar.tick({ songname: filename });
        }
    } else {
        console.log('Failed.');
    }
}

main().then(() => process.exit(0)).catch(e => console.log(e));