import { Innertube, YT } from 'youtubei.js';
import { parseArgs } from 'util';
import asyncPool from 'tiny-async-pool';

const { values: args } = parseArgs({
    args: Bun.argv,
    allowPositionals: true,
    strict: true,
    options: {
        channel: {
            'type': 'string',
        }
    }
});

if (!args.channel) throw Error("Channel not specified");

const youtube = await Innertube.create();
const channel = await youtube.getChannel(args.channel);
if (!channel) throw Error("Channel not found");

type StreamFeed = Awaited<ReturnType<typeof channel.getLiveStreams>> | YT.ChannelListContinuation;
type FeedVideo = StreamFeed['videos'][number];
type Format = NonNullable<Awaited<ReturnType<typeof youtube.getInfo>>['streaming_data']>['formats'][number];

const feedVids: FeedVideo[] = [];
let feed: StreamFeed = await channel.getLiveStreams();
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

let size = 0;

for await (const info of videos) {
    // if (video.key('is_upcoming').isBoolean() && video.key('is_upcoming').boolean()) continue;
    // if (video.key('is_live').isBoolean() && video.key('is_live').boolean()) continue;

    // const info = await youtube.getInfo(video.key('id').string());

    const formats = [
        ...(info.streaming_data?.formats ?? []),
        ...(info.streaming_data?.adaptive_formats ?? []),
    ];

    const format = getVideoFormat(formats);
    if (!format) {
        console.log(`No video format found for ${info.basic_info.id}`);
        continue;
    }

    const audioFormat = getAudioFormat(formats);
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

function formatSize(format: Format): number {
    if (format.content_length) return format.content_length;
    return format.bitrate / 8 * format.approx_duration_ms / 1000;
}

function videoFormatToString(format: Format): string {
    return `${format.quality_label ?? format.quality ?? 'unknown'} ${format.width}x${format.height} ${format.fps}fps ${format.bitrate}bps ${format.mime_type ?? 'unknown'}`;
}

function audioFormatToString(format: Format): string {
    return `${format.audio_quality ?? 'unknown'} ${format.audio_sample_rate ?? 'unknown'}Hz ${format.audio_channels ?? 'unknown'}ch ${format.bitrate}bps ${format.mime_type ?? 'unknown'}`;
}

function getAudioFormat(formats: Format[]): Format | null {
    const codecOrder = ['mp4a', 'aac', 'vorbis', 'opus', 'mp3', 'ac3', 'dts'].reverse();
    // find audio only formats
    const audioFormats = formats.filter(format => format.has_audio && !format.has_video);
    if (audioFormats.length === 0) return null;

    audioFormats.sort((a, b) => {
        const audioQualities = [
            'AUDIO_QUALITY_LOW',
            'AUDIO_QUALITY_MEDIUM',
            'AUDIO_QUALITY_HIGH',
        ];

        if (a.audio_quality && b.audio_quality) {
            const aq = audioQualities.indexOf(a.audio_quality);
            const bq = audioQualities.indexOf(b.audio_quality);
            if (aq !== bq) return bq - aq;
        }

        if (a.audio_channels !== b.audio_channels) return b.audio_channels! - a.audio_channels!;
        if (a.audio_sample_rate !== b.audio_sample_rate) return b.audio_sample_rate! - a.audio_sample_rate!;

        //console.log(a.mime_type, b.mime_type);
        // ex: audio/webm; codecs="opus"

        let aCodec = a.mime_type?.split(';')[1]?.split('=')[1]?.replace(/"/g, '');
        let bCodec = b.mime_type?.split(';')[1]?.split('=')[1]?.replace(/"/g, '');

        for (const codec of codecOrder) {
            if (aCodec.indexOf(codec) !== -1) aCodec = codec;
            if (bCodec.indexOf(codec) !== -1) bCodec = codec;
        }

        if (aCodec && bCodec) {
            const aCodecIndex = codecOrder.indexOf(aCodec);
            const bCodecIndex = codecOrder.indexOf(bCodec);
            if (aCodecIndex !== bCodecIndex) return aCodecIndex - bCodecIndex;
        } else if (aCodec) {
            return -1;
        } else if (bCodec) {
            return 1;
        }

        return 0;
    });

    return audioFormats.shift()!;
}

function getVideoFormat(formats: Format[]): Format | null {
    const codecOrder = ['h264', 'h265', 'vp9', 'vp9.2', 'av01', 'vp8',  'h263', 'theora'].reverse();
    // find video only formats
    const videoFormats = formats.filter(format => format.has_video && !format.has_audio);
    if (videoFormats.length === 0) return null;
    // sort by quality,res,fps,codec
    videoFormats.sort((a, b) => {
        if (a.quality_label && b.quality_label) {
            const aq = a.quality_label.split('p')[0];
            const bq = b.quality_label.split('p')[0];
            if (aq !== bq) return parseInt(bq) - parseInt(aq);
        }

        if (a.width !== b.width) return b.width - a.width;
        if (a.height !== b.height) return b.height - a.height;
        if (a.fps !== b.fps) return b.fps! - a.fps!;

        //console.log(a.mime_type, b.mime_type);
        // ex: video/webm; codecs="vp9"

        const codecMap = new Map<string, string>([
            ['avc1', 'h264'],
            ['avc3', 'h264'],
            ['vp9', 'vp9'],
            ['vp8', 'vp8'],
            ['mp4v', 'h263'],
            ['theora', 'theora'],
        ]);

        let aCodec = a.mime_type?.split(';')[1]?.split('=')[1]?.replace(/"/g, '');
        let bCodec = b.mime_type?.split(';')[1]?.split('=')[1]?.replace(/"/g, '');

        for (const [key, value] of codecMap.entries()) {
            if (aCodec.indexOf(key) !== -1) aCodec = value;
            if (bCodec.indexOf(key) !== -1) bCodec = value;
        }

        if (aCodec && bCodec) {
            const aCodecIndex = codecOrder.indexOf(aCodec);
            const bCodecIndex = codecOrder.indexOf(bCodec);
            // console.log(aCodecIndex, bCodecIndex);
            // console.log(aCodec, bCodec);
            if (aCodecIndex !== bCodecIndex) return aCodecIndex - bCodecIndex;
        } else if (aCodec) {
            return -1;
        } else if (bCodec) {
            return 1;
        }

        return 0;
    });

    return videoFormats.shift()!;
}

