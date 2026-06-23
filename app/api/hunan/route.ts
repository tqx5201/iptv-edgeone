import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';

//export const runtime = 'edge';

// 湖南TV频道映射表
const CHANNEL_MAP: Record<string, string> = {
  // 湖南卫视系列
  'hnjshi': '280',    // 湖南经视
  'hndy': '221',      // 湖南电影
  'hnds': '346',      // 湖南都市
  'hndsj': '484',     // 湖南电视剧
  'hnaw': '261',      // 湖南爱晚
  'hngj': '229',      // 湖南国际
  'hnyl': '344',      // 湖南娱乐
  
  // 购物与特色频道
  'klg': '267',       // 快乐购
  'cpd': '578',       // 茶频道
  
  // 金鹰系列
  'jyjs': '316',      // 金鹰纪实
  'jykt': '287',      // 金鹰卡通
  'klcd': '218',      // 快乐垂钓
  'xfpy': '329',      // 先锋乒羽
  
  // 长沙频道
  'csxw': '269',      // 长沙新闻
  'cszf': '254',      // 长沙政法
  'csnx': '230',      // 长沙女性
};

// 频道名称映射
const CHANNEL_NAMES: Record<string, string> = {
  'hnjshi': '湖南经视',
  'hndy': '湖南电影',
  'hnds': '湖南都市',
  'hndsj': '湖南电视剧',
  'hnaw': '湖南爱晚',
  'hngj': '湖南国际',
  'hnyl': '湖南娱乐',
  'klg': '快乐购',
  'cpd': '茶频道',
  'jyjs': '金鹰纪实',
  'jykt': '金鹰卡通',
  'klcd': '快乐垂钓',
  'xfpy': '先锋乒羽',
  'csxw': '长沙新闻',
  'cszf': '长沙政法',
  'csnx': '长沙女性',
};

// 频道分组
const CHANNEL_GROUPS: Record<string, string> = {
  'hnjshi': '湖南省级',
  'hndy': '湖南省级',
  'hnds': '湖南省级',
  'hndsj': '湖南省级',
  'hnaw': '湖南省级',
  'hngj': '湖南省级',
  'hnyl': '湖南省级',
  'klg': '购物特色',
  'cpd': '购物特色',
  'jyjs': '金鹰系列',
  'jykt': '金鹰系列',
  'klcd': '金鹰系列',
  'xfpy': '金鹰系列',
  'csxw': '长沙频道',
  'cszf': '长沙频道',
  'csnx': '长沙频道',
};

// 芒果TV API基础URL
const API_BASE = 'http://pwlp.bz.mgtv.com/v1/epg/turnplay/getLivePlayUrlMPP';

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

  const apiChannelId = CHANNEL_MAP[channelId] || channelId;
  const apiUrl = `${API_BASE}?version=PCweb_1.0&platform=1&buss_id=2000001&channel_id=${apiChannelId}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error(`API request failed: ${response.status}`);
      return null;
    }

    const json = await response.json();

    if (json?.data?.url) {
      const streamUrl = json.data.url;
      
      // 更新缓存
      streamCache.set(channelId, {
        url: streamUrl,
        timestamp: now,
      });

      return streamUrl;
    }

    console.error('No valid m3u8 URL found in response:', json);
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

  for (const [channelId, apiId] of Object.entries(CHANNEL_MAP)) {
    const name = CHANNEL_NAMES[channelId] || channelId;
    const group = CHANNEL_GROUPS[channelId] || '湖南';
    m3u += `#EXTINF:-1 group-title="${group}",${name}\n`;
    m3u += `http://${host}${pathname}?id=${channelId}\n`;
  }

  return m3u;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || 'hnws';

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
