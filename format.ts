import type { Innertube } from 'youtubei.js';

type Format = NonNullable<Awaited<ReturnType<Innertube['getInfo']>>['streaming_data']>['formats'][number];

export function formatSize(format: Format): number {
    if (format.content_length) return format.content_length;
    return format.bitrate / 8 * format.approx_duration_ms / 1000;
}

export function videoFormatToString(format: Format): string {
    return `${format.itag} ${format.quality_label ?? format.quality ?? 'unknown'} ${format.width}x${format.height} ${format.fps}fps ${format.bitrate}bps ${format.mime_type ?? 'unknown'}`;
}

export function audioFormatToString(format: Format): string {
    return `${format.itag} ${format.audio_quality ?? 'unknown'} ${format.audio_sample_rate ?? 'unknown'}Hz ${format.audio_channels ?? 'unknown'}ch ${format.bitrate}bps ${format.mime_type ?? 'unknown'}`;
}

type ITagMap = {
    [key: string]: {
        ext: string;
        width?: number;
        height?: number;
        acodec?: string;
        vcodec?: string;
        abr?: number;
        fps?: number;
        format_note?: string;
        preference?: number;
        container?: string;
    };
};

// Taken from: https://github.com/yt-dlp/yt-dlp/blob/5f25f348f9eb5db842b1ec6799f95bebb7ba35a7/yt_dlp/extractor/youtube.py#L1171
const ITAG_FORMATS: ITagMap = {
    '5': {'ext': 'flv', 'width': 400, 'height': 240, 'acodec': 'mp3', 'abr': 64, 'vcodec': 'h263'},
    '6': {'ext': 'flv', 'width': 450, 'height': 270, 'acodec': 'mp3', 'abr': 64, 'vcodec': 'h263'},
    '13': {'ext': '3gp', 'acodec': 'aac', 'vcodec': 'mp4v'},
    '17': {'ext': '3gp', 'width': 176, 'height': 144, 'acodec': 'aac', 'abr': 24, 'vcodec': 'mp4v'},
    '18': {'ext': 'mp4', 'width': 640, 'height': 360, 'acodec': 'aac', 'abr': 96, 'vcodec': 'h264'},
    '22': {'ext': 'mp4', 'width': 1280, 'height': 720, 'acodec': 'aac', 'abr': 192, 'vcodec': 'h264'},
    '34': {'ext': 'flv', 'width': 640, 'height': 360, 'acodec': 'aac', 'abr': 128, 'vcodec': 'h264'},
    '35': {'ext': 'flv', 'width': 854, 'height': 480, 'acodec': 'aac', 'abr': 128, 'vcodec': 'h264'},
    // itag 36 videos are either 320x180 (BaW_jenozKc) or 320x240 (__2ABJjxzNo), abr varies as well
    '36': {'ext': '3gp', 'width': 320, 'acodec': 'aac', 'vcodec': 'mp4v'},
    '37': {'ext': 'mp4', 'width': 1920, 'height': 1080, 'acodec': 'aac', 'abr': 192, 'vcodec': 'h264'},
    '38': {'ext': 'mp4', 'width': 4096, 'height': 3072, 'acodec': 'aac', 'abr': 192, 'vcodec': 'h264'},
    '43': {'ext': 'webm', 'width': 640, 'height': 360, 'acodec': 'vorbis', 'abr': 128, 'vcodec': 'vp8'},
    '44': {'ext': 'webm', 'width': 854, 'height': 480, 'acodec': 'vorbis', 'abr': 128, 'vcodec': 'vp8'},
    '45': {'ext': 'webm', 'width': 1280, 'height': 720, 'acodec': 'vorbis', 'abr': 192, 'vcodec': 'vp8'},
    '46': {'ext': 'webm', 'width': 1920, 'height': 1080, 'acodec': 'vorbis', 'abr': 192, 'vcodec': 'vp8'},
    '59': {'ext': 'mp4', 'width': 854, 'height': 480, 'acodec': 'aac', 'abr': 128, 'vcodec': 'h264'},
    '78': {'ext': 'mp4', 'width': 854, 'height': 480, 'acodec': 'aac', 'abr': 128, 'vcodec': 'h264'},


    // 3D videos
    '82': {'ext': 'mp4', 'height': 360, 'format_note': '3D', 'acodec': 'aac', 'abr': 128, 'vcodec': 'h264', 'preference': -20},
    '83': {'ext': 'mp4', 'height': 480, 'format_note': '3D', 'acodec': 'aac', 'abr': 128, 'vcodec': 'h264', 'preference': -20},
    '84': {'ext': 'mp4', 'height': 720, 'format_note': '3D', 'acodec': 'aac', 'abr': 192, 'vcodec': 'h264', 'preference': -20},
    '85': {'ext': 'mp4', 'height': 1080, 'format_note': '3D', 'acodec': 'aac', 'abr': 192, 'vcodec': 'h264', 'preference': -20},
    '100': {'ext': 'webm', 'height': 360, 'format_note': '3D', 'acodec': 'vorbis', 'abr': 128, 'vcodec': 'vp8', 'preference': -20},
    '101': {'ext': 'webm', 'height': 480, 'format_note': '3D', 'acodec': 'vorbis', 'abr': 192, 'vcodec': 'vp8', 'preference': -20},
    '102': {'ext': 'webm', 'height': 720, 'format_note': '3D', 'acodec': 'vorbis', 'abr': 192, 'vcodec': 'vp8', 'preference': -20},

    // Apple HTTP Live Streaming
    '91': {'ext': 'mp4', 'height': 144, 'format_note': 'HLS', 'acodec': 'aac', 'abr': 48, 'vcodec': 'h264', 'preference': -10},
    '92': {'ext': 'mp4', 'height': 240, 'format_note': 'HLS', 'acodec': 'aac', 'abr': 48, 'vcodec': 'h264', 'preference': -10},
    '93': {'ext': 'mp4', 'height': 360, 'format_note': 'HLS', 'acodec': 'aac', 'abr': 128, 'vcodec': 'h264', 'preference': -10},
    '94': {'ext': 'mp4', 'height': 480, 'format_note': 'HLS', 'acodec': 'aac', 'abr': 128, 'vcodec': 'h264', 'preference': -10},
    '95': {'ext': 'mp4', 'height': 720, 'format_note': 'HLS', 'acodec': 'aac', 'abr': 256, 'vcodec': 'h264', 'preference': -10},
    '96': {'ext': 'mp4', 'height': 1080, 'format_note': 'HLS', 'acodec': 'aac', 'abr': 256, 'vcodec': 'h264', 'preference': -10},
    '132': {'ext': 'mp4', 'height': 240, 'format_note': 'HLS', 'acodec': 'aac', 'abr': 48, 'vcodec': 'h264', 'preference': -10},
    '151': {'ext': 'mp4', 'height': 72, 'format_note': 'HLS', 'acodec': 'aac', 'abr': 24, 'vcodec': 'h264', 'preference': -10},

    // DASH mp4 video
    '133': {'ext': 'mp4', 'height': 240, 'format_note': 'DASH video', 'vcodec': 'h264'},
    '134': {'ext': 'mp4', 'height': 360, 'format_note': 'DASH video', 'vcodec': 'h264'},
    '135': {'ext': 'mp4', 'height': 480, 'format_note': 'DASH video', 'vcodec': 'h264'},
    '136': {'ext': 'mp4', 'height': 720, 'format_note': 'DASH video', 'vcodec': 'h264'},
    '137': {'ext': 'mp4', 'height': 1080, 'format_note': 'DASH video', 'vcodec': 'h264'},
    '138': {'ext': 'mp4', 'format_note': 'DASH video', 'vcodec': 'h264'},  // Height can vary (https://github.com/ytdl-org/youtube-dl/issues/4559)
    '160': {'ext': 'mp4', 'height': 144, 'format_note': 'DASH video', 'vcodec': 'h264'},
    '212': {'ext': 'mp4', 'height': 480, 'format_note': 'DASH video', 'vcodec': 'h264'},
    '264': {'ext': 'mp4', 'height': 1440, 'format_note': 'DASH video', 'vcodec': 'h264'},
    '298': {'ext': 'mp4', 'height': 720, 'format_note': 'DASH video', 'vcodec': 'h264', 'fps': 60},
    '299': {'ext': 'mp4', 'height': 1080, 'format_note': 'DASH video', 'vcodec': 'h264', 'fps': 60},
    '266': {'ext': 'mp4', 'height': 2160, 'format_note': 'DASH video', 'vcodec': 'h264'},

    // Dash mp4 audio
    '139': {'ext': 'm4a', 'format_note': 'DASH audio', 'acodec': 'aac', 'abr': 48, 'container': 'm4a_dash'},
    '140': {'ext': 'm4a', 'format_note': 'DASH audio', 'acodec': 'aac', 'abr': 128, 'container': 'm4a_dash'},
    '141': {'ext': 'm4a', 'format_note': 'DASH audio', 'acodec': 'aac', 'abr': 256, 'container': 'm4a_dash'},
    '256': {'ext': 'm4a', 'format_note': 'DASH audio', 'acodec': 'aac', 'container': 'm4a_dash'},
    '258': {'ext': 'm4a', 'format_note': 'DASH audio', 'acodec': 'aac', 'container': 'm4a_dash'},
    '325': {'ext': 'm4a', 'format_note': 'DASH audio', 'acodec': 'dtse', 'container': 'm4a_dash'},
    '328': {'ext': 'm4a', 'format_note': 'DASH audio', 'acodec': 'ec-3', 'container': 'm4a_dash'},

    // Dash webm
    '167': {'ext': 'webm', 'height': 360, 'width': 640, 'format_note': 'DASH video', 'container': 'webm', 'vcodec': 'vp8'},
    '168': {'ext': 'webm', 'height': 480, 'width': 854, 'format_note': 'DASH video', 'container': 'webm', 'vcodec': 'vp8'},
    '169': {'ext': 'webm', 'height': 720, 'width': 1280, 'format_note': 'DASH video', 'container': 'webm', 'vcodec': 'vp8'},
    '170': {'ext': 'webm', 'height': 1080, 'width': 1920, 'format_note': 'DASH video', 'container': 'webm', 'vcodec': 'vp8'},
    '218': {'ext': 'webm', 'height': 480, 'width': 854, 'format_note': 'DASH video', 'container': 'webm', 'vcodec': 'vp8'},
    '219': {'ext': 'webm', 'height': 480, 'width': 854, 'format_note': 'DASH video', 'container': 'webm', 'vcodec': 'vp8'},
    '278': {'ext': 'webm', 'height': 144, 'format_note': 'DASH video', 'container': 'webm', 'vcodec': 'vp9'},
    '242': {'ext': 'webm', 'height': 240, 'format_note': 'DASH video', 'vcodec': 'vp9'},
    '243': {'ext': 'webm', 'height': 360, 'format_note': 'DASH video', 'vcodec': 'vp9'},
    '244': {'ext': 'webm', 'height': 480, 'format_note': 'DASH video', 'vcodec': 'vp9'},
    '245': {'ext': 'webm', 'height': 480, 'format_note': 'DASH video', 'vcodec': 'vp9'},
    '246': {'ext': 'webm', 'height': 480, 'format_note': 'DASH video', 'vcodec': 'vp9'},
    '247': {'ext': 'webm', 'height': 720, 'format_note': 'DASH video', 'vcodec': 'vp9'},
    '248': {'ext': 'webm', 'height': 1080, 'format_note': 'DASH video', 'vcodec': 'vp9'},
    '271': {'ext': 'webm', 'height': 1440, 'format_note': 'DASH video', 'vcodec': 'vp9'},
    // itag 272 videos are either 3840x2160 (e.g. RtoitU2A-3E) or 7680x4320 (sLprVF6d7Ug)
    '272': {'ext': 'webm', 'height': 2160, 'format_note': 'DASH video', 'vcodec': 'vp9'},
    '302': {'ext': 'webm', 'height': 720, 'format_note': 'DASH video', 'vcodec': 'vp9', 'fps': 60},
    '303': {'ext': 'webm', 'height': 1080, 'format_note': 'DASH video', 'vcodec': 'vp9', 'fps': 60},
    '308': {'ext': 'webm', 'height': 1440, 'format_note': 'DASH video', 'vcodec': 'vp9', 'fps': 60},
    '313': {'ext': 'webm', 'height': 2160, 'format_note': 'DASH video', 'vcodec': 'vp9'},
    '315': {'ext': 'webm', 'height': 2160, 'format_note': 'DASH video', 'vcodec': 'vp9', 'fps': 60},

    // Dash webm audio
    '171': {'ext': 'webm', 'acodec': 'vorbis', 'format_note': 'DASH audio', 'abr': 128},
    '172': {'ext': 'webm', 'acodec': 'vorbis', 'format_note': 'DASH audio', 'abr': 256},

    // Dash webm audio with opus inside
    '249': {'ext': 'webm', 'format_note': 'DASH audio', 'acodec': 'opus', 'abr': 50},
    '250': {'ext': 'webm', 'format_note': 'DASH audio', 'acodec': 'opus', 'abr': 70},
    '251': {'ext': 'webm', 'format_note': 'DASH audio', 'acodec': 'opus', 'abr': 160},

    // RTMP (unnamed)
   // '_rtmp': {/*'protocol': 'rtmp'*/},

    // av01 video only formats sometimes served with "unknown" codecs
    '394': {'ext': 'mp4', 'height': 144, 'format_note': 'DASH video', 'vcodec': 'av01.0.00M.08'},
    '395': {'ext': 'mp4', 'height': 240, 'format_note': 'DASH video', 'vcodec': 'av01.0.00M.08'},
    '396': {'ext': 'mp4', 'height': 360, 'format_note': 'DASH video', 'vcodec': 'av01.0.01M.08'},
    '397': {'ext': 'mp4', 'height': 480, 'format_note': 'DASH video', 'vcodec': 'av01.0.04M.08'},
    '398': {'ext': 'mp4', 'height': 720, 'format_note': 'DASH video', 'vcodec': 'av01.0.05M.08'},
    '399': {'ext': 'mp4', 'height': 1080, 'format_note': 'DASH video', 'vcodec': 'av01.0.08M.08'},
    '400': {'ext': 'mp4', 'height': 1440, 'format_note': 'DASH video', 'vcodec': 'av01.0.12M.08'},
    '401': {'ext': 'mp4', 'height': 2160, 'format_note': 'DASH video', 'vcodec': 'av01.0.12M.08'},
};

export function getVideoFormat(formats: Format[]): Format | null {
    const codecOrder = [
        'av01',
        'vp9.2',
        'vp9',
        'h265',
        'h264',
        'vp8',
        'h263',
        'theora',
    ].reverse();

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

        let aCodec = ITAG_FORMATS[String(a.itag)]?.vcodec;
        let bCodec = ITAG_FORMATS[String(b.itag)]?.vcodec;

        for (const codec of codecOrder) {
            if (aCodec && aCodec.indexOf(codec) !== -1) aCodec = codec;
            if (bCodec && bCodec.indexOf(codec) !== -1) bCodec = codec;
        }

        for (const codec of codecOrder) {
            if (aCodec && aCodec === codec) aCodec = codec;
            if (bCodec && bCodec === codec) bCodec = codec;
        }

        // console.log(aCodec, bCodec);

        if (aCodec && bCodec) {
            const aCodecIndex = codecOrder.indexOf(aCodec);
            const bCodecIndex = codecOrder.indexOf(bCodec);
            if (aCodecIndex !== bCodecIndex) return bCodecIndex - aCodecIndex;
        } else if (aCodec) {
            return -1;
        } else if (bCodec) {
            return 1;
        }

        return 0;
    });

    return videoFormats.shift()!;
}

export function getAudioFormat(formats: Format[]): Format | null {
    const codecOrder = [
        'flac',
        'alac',
        'wav',
        'aiff',
        'opus',
        'vorbis',
        'aac',
        'mp4a',
        'mp3',
        'ac4',
        'eac3',
        'ac3',
        'dts',
    ].reverse();
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

        let aCodec = ITAG_FORMATS[String(a.itag)]?.acodec;
        let bCodec = ITAG_FORMATS[String(b.itag)]?.acodec;

        for (const codec of codecOrder) {
            if (aCodec && aCodec.indexOf(codec) !== -1) aCodec = codec;
            if (bCodec && bCodec.indexOf(codec) !== -1) bCodec = codec;
        }

        for (const codec of codecOrder) {
            if (aCodec && aCodec === codec) aCodec = codec;
            if (bCodec && bCodec === codec) bCodec = codec;
        }

        if (aCodec && bCodec) {
            const aCodecIndex = codecOrder.indexOf(aCodec);
            const bCodecIndex = codecOrder.indexOf(bCodec);
            if (aCodecIndex !== bCodecIndex) return bCodecIndex - aCodecIndex;
        } else if (aCodec) {
            return -1;
        } else if (bCodec) {
            return 1;
        }

        return 0;
    });

    return audioFormats.shift()!;
}

