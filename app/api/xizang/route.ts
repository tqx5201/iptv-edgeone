import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';

//export const runtime = 'edge';

// 西藏TV频道映射表
const CHANNEL_MAP: Record<string, number> = {
  'ws': 0,   // 西藏卫视
  'zy': 1,   // 西藏藏语
  'ys': 2,   // 西藏影视
};

// 频道名称映射
const CHANNEL_NAMES: Record<string, string> = {
  'ws': '西藏卫视',
  'zy': '西藏藏语',
  'ys': '西藏影视',
};

// 西藏TV API配置
const API_URL = 'https://api.vtibet.cn/xizangmobileinf/rest/xz/cardgroups';
const API_BODY = 'json=%7B%22cardgroups%22%3A%22LIVECAST%22%2C%22paging%22%3A%7B%22page_no%22%3A%221%22%2C%22page_size%22%3A%22100%22%7D%2C%22version%22%3A%221.0.0%22%7D';

// 缓存配置
const STREAM_CACHE_TTL = 300; // 5分钟
let streamCache: Map<string, { url: string; timestamp: number }> = new Map();

// 获取频道流地址
async function getStreamUrl(channelId: string): Promise<string | null> {
  // 检查缓存
  const now = Date.now();
  const cached = streamCache.get(channelId);
  if (cached && (now - cached.timestamp < STREAM_CACHE_TTL * 1000)) {
    return cached.url;
  }

  const channelIndex = CHANNEL_MAP[channelId];
  if (channelIndex === undefined) {
    console.error(`Unknown channel ID: ${channelId}`);
    return null;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: API_BODY,
    });

    if (!response.ok) {
      console.error(`API request failed: ${response.status}`);
      return null;
    }

    const json = await response.json();

    // 提取流地址：cardgroups[1].cards[channelIndex].video.url_hd
    if (json?.cardgroups?.[1]?.cards?.[channelIndex]?.video?.url_hd) {
      const streamUrl = json.cardgroups[1].cards[channelIndex].video.url_hd;
      
      // 更新缓存
      streamCache.set(channelId, {
        url: streamUrl,
        timestamp: now,
      });

      return streamUrl;
    }

    console.error('No valid stream URL found in response');
    return null;
  } catch (error) {
    console.error('Error fetching stream URL:', error);
    return null;
  }
}

// 生成播放列表
async function generatePlaylist(req: NextRequest): Promise<string> {
  const host = getRealHost(req);
  const pathname = new URL(req.url).pathname;

  let m3u = '#EXTM3U\n';

  for (const [channelId, channelIndex] of Object.entries(CHANNEL_MAP)) {
    const name = CHANNEL_NAMES[channelId] || channelId;
    m3u += `#EXTINF:-1 group-title="西藏",${name}\n`;
    m3u += `http://${host}${pathname}?id=${channelId}\n`;
  }

  return m3u;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || 'ys';

  // 生成播放列表
  if (id === 'list') {
    const playlist = await generatePlaylist(req);
    return new NextResponse(playlist, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl; charset=UTF-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // 获取单个频道流地址
  const streamUrl = await getStreamUrl(id);

  if (!streamUrl) {
    return new NextResponse('Channel not found or stream unavailable', { status: 404 });
  }

  // 302重定向到流地址
  return NextResponse.redirect(streamUrl);
}
