import { Innertube, YT } from 'youtubei.js';
import { parseArgs } from 'util';
import {
    formatSize,
    audioFormatToString,
    videoFormatToString,
    getAudioFormat,
    getVideoFormat
} from './format';
import asyncPool from 'tiny-async-pool';

const { values: args } = parseArgs({
    args: Bun.argv,
    allowPositionals: true,
    strict: true,
    options: {
        channel: {
            'type': 'string',
        },
        'gen-script-template': {
            'type': 'string',
            'short': 'g',
        },
        plugin: {
            'type': 'string',
            'short': 'p',
        },
        'streams': {
            'type': 'boolean',
            'short': 's',
        }
    }
});

if (args['gen-script-template']) {
    await createPluginScript(args['gen-script-template']);
    process.exit(0);
}

if (!args.channel) throw Error("Channel not specified");

const youtube = await Innertube.create();
const channel = await youtube.getChannel(args.channel);
if (!channel) throw Error("Channel not found");

const feedFunc = args.streams ?
    channel.getLiveStreams.bind(channel) :
    channel.getVideos.bind(channel);

type StreamFeed = Awaited<ReturnType<typeof feedFunc>> | YT.ChannelListContinuation;
type FeedVideo = StreamFeed['videos'][number];

const feedVids: FeedVideo[] = [];
let feed: StreamFeed = await feedFunc();
let videoChunk: FeedVideo[] = feed.videos;

while (videoChunk.length > 0) {
    feedVids.push(...videoChunk);

    try {
        feed = await feed.getContinuation();
    } catch {
        videoChunk = [];
        break;
    }
    
    videoChunk = feed.videos;
}

const availableVids = feedVids.filter(video => {
    return (!video.key('is_upcoming').isBoolean() || !video.key('is_upcoming').boolean()) &&
        (!video.key('is_live').isBoolean() || !video.key('is_live').boolean());
});

console.log(`Found ${availableVids.length} available videos`);

const videos = asyncPool(10, availableVids, async video => youtube.getInfo(video.key('id').string()));
const plugin = args.plugin ? await import(args.plugin) : null;

let size = 0;

for await (const info of videos) {
    const formats = [
        ...(info.streaming_data?.formats ?? []),
        ...(info.streaming_data?.adaptive_formats ?? []),
    ];

    let videoFunc = plugin?.getVideoFormat ?? getVideoFormat;
    let audioFunc = plugin?.getAudioFormat ?? getAudioFormat;

    const format = videoFunc(formats);
    if (!format) {
        console.log(`No video format found for ${info.basic_info.id}`);
        continue;
    }

    const audioFormat = audioFunc(formats);
    if (!audioFormat) {
        console.log(`No audio format found for ${info.basic_info.id}`);
        continue;
    }

    console.log(`Video format for ${info.basic_info.id}: ${videoFormatToString(format)}`);
    console.log(`Audio format for ${info.basic_info.id}: ${audioFormatToString(audioFormat)}`);

    const videoSize = formatSize(format);
    const audioSize = formatSize(audioFormat);

    console.log(`Video size: ${videoSize} bytes`);
    console.log(`Audio size: ${audioSize} bytes`);

    const totalSize = videoSize + audioSize;
    const totalSizeGB = totalSize / 1024 / 1024 / 1024;
    console.log(`Total size: ${totalSize} bytes (${totalSizeGB} GB)`);

    if (Number.isNaN(totalSize)) {
        console.log(`Invalid size for ${info.basic_info.id}`);
        continue;
    }
    
    size += totalSize;
}

const totalSizeGB = size / 1024 / 1024 / 1024;
console.log(`Total size for all videos: ${size} bytes (${totalSizeGB} GB)`);

async function createPluginScript(outpath: string) {
    const content = `
/**
 * This function will override the default video format selector
 * and will select the highest quality video format available.
 * 
 * @typedef {Object} Format
 * @property {number} itag
 * @property {string} mime_type
 * @property {boolean} is_type_otf
 * @property {number} bitrate
 * @property {number | undefined} average_bitrate
 * @property {number} width
 * @property {number} height
 * @property {{ start: number, end: number } | undefined} init_range
 * @property {{ start: number, end: number } | undefined} index_range
 * @property {Date} last_modified
 * @property {number | undefined} content_length
 * @property {string | undefined} quality
 * @property {string | undefined} quality_label
 * @property {number | undefined} fps
 * @property {string | undefined} url
 * @property {string | undefined} cipher
 * @property {string | undefined} signature_cipher
 * @property {string | undefined} audio_quality
 * @property {{ audio_is_default: boolean, display_name: string, id: string } | undefined} audio_track
 * @property {number} approx_duration_ms
 * @property {number | undefined} audio_sample_rate
 * @property {number | undefined} audio_channels
 * @property {number | undefined} loudness_db
 * @property {boolean} has_audio
 * @property {boolean} has_video
 * @property {string | null | undefined} language
 * @property {boolean | undefined} is_dubbed
 * @property {boolean | undefined} is_descriptive
 * @property {boolean | undefined} is_original
 * @property {{ primaries: string | undefined, transfer_characteristics: string | undefined, matrix_coefficients: string | undefined } | undefined} color_info
 * 
 * @typedef {(formats: Format[]) => Format | null} FormatSelector
 **/

/** @type {FormatSelector} */
function getVideoFormat(formats) {
    return null;
}

/** @type {FormatSelector} */
function getAudioFormat(formats) {
    return null;
}
`

    await Bun.write(outpath, content);
}