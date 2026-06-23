import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';

//export const runtime = 'edge';

// 贵州TV频道映射表
const CHANNEL_MAP: Record<string, string> = {
  'gzws': 'ch01',   // 贵州卫视
  'gzgg': 'ch02',   // 贵州公共
  'gzwy': 'ch03',   // 贵州文艺
  'gzsh': 'ch04',   // 贵州生活
  'gz5p': 'ch05',   // 贵州生态乡村
  'kjjk': 'ch06',   // 贵州科教健康
  'ydsz': 'ch13',   // 贵州移动电视
};

// 频道名称映射
const CHANNEL_NAMES: Record<string, string> = {
  'gzws': '贵州卫视',
  'gzgg': '贵州公共',
  'gzwy': '贵州文艺',
  'gzsh': '贵州生活',
  'gz5p': '贵州生态乡村',
  'kjjk': '贵州科教健康',
  'ydsz': '贵州移动电视',
};

// 贵州TV API基础URL
const API_BASE = 'https://api.gzstv.com/v1/tv';

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

  const channelCode = CHANNEL_MAP[channelId];
  if (!channelCode) {
    console.error(`Unknown channel ID: ${channelId}`);
    return null;
  }

  const apiUrl = `${API_BASE}/${channelCode}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error(`API request failed: ${response.status}`);
      return null;
    }

    const json = await response.json();

    if (json?.stream_url) {
      const streamUrl = json.stream_url;
      
      // 更新缓存
      streamCache.set(channelId, {
        url: streamUrl,
        timestamp: now,
      });

      return streamUrl;
    }

    console.error('No valid stream_url found in response:', json);
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

  for (const [channelId, channelCode] of Object.entries(CHANNEL_MAP)) {
    const name = CHANNEL_NAMES[channelId] || channelId;
    m3u += `#EXTINF:-1 group-title="贵州",${name}\n`;
    m3u += `http://${host}${pathname}?id=${channelId}\n`;
  }

  return m3u;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || 'gzws';

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
