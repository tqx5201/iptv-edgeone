import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';

//export const runtime = 'edge';

// 频道映射表
const CHANNEL_MAP: Record<string, string> = {
  ynws: 'yunnanweishi',     // 云南卫视
  ynds: 'yunnandushi',      // 云南都市
  ynyl: 'yunnanyule',       // 云南娱乐
  yngg: 'yunnangonggong',   // 云南公共
  yngj: 'yunnanguoji',      // 云南国际
  ynse: 'yunnanshaoer',     // 云南少儿
};

// 频道中文名称映射
const CHANNEL_NAME_MAP: Record<string, string> = {
  ynws: '云南卫视',
  ynds: '云南都市',
  ynyl: '云南娱乐',
  yngg: '云南公共',
  yngj: '云南国际',
  ynse: '云南少儿',
};

// API配置
const API_BASE = 'https://yntv-api.yntv.cn';
const STREAM_BASE = 'https://tvlive.yntv.cn';

// 请求头配置
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  'Origin': 'https://www.yntv.cn',
  'Referer': 'https://www.yntv.cn/',
};

interface StreamInfo {
  url: string;
  string: string;
  time: number;
}

/**
 * 获取M3U8播放列表
 */
async function getM3U8Playlist(channelId: string, host: string, pathname: string): Promise<Response> {
  const channelName = CHANNEL_MAP[channelId];
  
  if (!channelName) {
    return new NextResponse('Invalid channel ID', { status: 400 });
  }

  try {
    // 1. 获取流信息
    const apiUrl = `${API_BASE}/index/jmd/getRq?name=${channelName}`;
    const apiResponse = await fetch(apiUrl, {
      headers: DEFAULT_HEADERS,
    });

    if (!apiResponse.ok) {
      return new NextResponse('Failed to fetch stream info', { status: 502 });
    }

    const streamInfo: StreamInfo = await apiResponse.json();
    
    // 2. 获取M3U8播放列表
    const m3u8Url = `${STREAM_BASE}${streamInfo.url}?wsSecret=${streamInfo.string}&wsTime=${streamInfo.time}`;
    const m3u8Response = await fetch(m3u8Url, {
      headers: {
        'User-Agent': DEFAULT_HEADERS['User-Agent'],
        'Referer': DEFAULT_HEADERS['Referer'],
      },
    });

    if (!m3u8Response.ok) {
      return new NextResponse('Failed to fetch M3U8', { status: 502 });
    }

    let m3u8Content = await m3u8Response.text();

    // 3. 替换TS文件路径为代理路径
    // 注意: TS URL传递时不要使用encodeURIComponent,直接拼接即可
    const tsBaseUrl = `${STREAM_BASE}/live/${channelName}/`;
    const proxyBaseUrl = `http://${host}${pathname}?ts=`;
    
    m3u8Content = m3u8Content.replace(
      /([^\s]+\.ts)/gi,
      (match) => `${proxyBaseUrl}${tsBaseUrl}${match}`
    );

    return new NextResponse(m3u8Content, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

/**
 * 代理TS文件
 */
async function proxyTSFile(tsUrl: string): Promise<Response> {
  try {
    const response = await fetch(tsUrl, {
      headers: {
        'User-Agent': DEFAULT_HEADERS['User-Agent'],
        'Referer': DEFAULT_HEADERS['Referer'],
      },
    });

    if (!response.ok) {
      return new NextResponse('Failed to fetch TS file', { status: 502 });
    }

    // 直接返回TS文件流
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'video/MP2T',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('Error proxying TS:', error);
    return new NextResponse('Failed to proxy TS file', { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get('id') || 'ynws';
  const tsUrl = searchParams.get('ts');

  // 如果有ts参数,代理TS文件
  if (tsUrl) {
    return proxyTSFile(tsUrl);
  }

  // 如果是list请求,返回频道列表
  if (channelId === 'list') {
    let m3u8Content = '#EXTM3U\n';
    
    const host = getRealHost(request);
    const protocol = request.url.startsWith('https') ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}/api/yunnan`;

    for (const [cid] of Object.entries(CHANNEL_MAP)) {
      const chineseName = CHANNEL_NAME_MAP[cid] || cid;
      m3u8Content += `#EXTINF:-1,${chineseName}\n`;
      m3u8Content += `${baseUrl}?id=${cid}\n`;
    }

    return new NextResponse(m3u8Content, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // 检查频道是否存在
  if (!CHANNEL_MAP[channelId]) {
    return new NextResponse(
      `Channel not found: ${channelId}\nAvailable channels: ${Object.keys(CHANNEL_MAP).join(', ')}`,
      {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }
    );
  }

  const host = request.headers.get('host') || '';
  const pathname = new URL(request.url).pathname;

  // 返回M3U8播放列表
  return getM3U8Playlist(channelId, host, pathname);
}
