import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';

/**
 * 安徽台 - 全链路代理（动态频道）
 * 
 * 实现流程：
 * 1. 动态调用 API 获取频道列表和 M3U8 地址（带缓存）
 * 2. 获取一级 M3U8，提取二级 M3U8 路径
 * 3. 获取二级 M3U8，代理所有 TS 文件
 * 4. 所有请求都添加 Referer: https://www.ahtv.cn/ 头
 * 
 * 注意：CDN 需要 Referer 验证，必须全链路代理
 */

//export const runtime = 'edge';

// 频道名称到友好ID的映射
const CHANNEL_NAME_MAP: Record<string, string> = {
  '安徽卫视': 'ahws',
  '经济生活': 'ahjj',
  '综艺体育': 'ahzy',
  '影视频道': 'ahys',
  '安徽公共': 'ahgg',
  '农业·科教': 'ahnk',
  '安徽国际': 'ahgj',
  '移动电视': 'ahyd',
};

// API 配置
const API_URL = 'https://mapi.ahtv.cn/api/v1/channel.php?is_audio=0&category_id=1%2C2';
const REFERER = 'https://www.ahtv.cn/';

// 请求头配置
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
  'Referer': REFERER,
  'Accept': '*/*',
  'Accept-Language': 'zh-CN,zh;q=0.9',
};

// 频道数据接口
interface ChannelData {
  id: number;
  name: string;
  m3u8: string;
}

// 缓存配置（Edge Runtime 使用内存缓存）
const channelCache = new Map<string, { data: ChannelData[]; timestamp: number }>();
const CACHE_TTL = 3600 * 1000; // 1小时

/**
 * 获取频道列表（带缓存）
 */
async function getChannelList(): Promise<ChannelData[]> {
  const cacheKey = 'channel_list';
  const now = Date.now();
  
  // 检查缓存
  const cached = channelCache.get(cacheKey);
  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }
  
  // 获取频道列表
  try {
    const response = await fetch(API_URL, {
      headers: {
        ...DEFAULT_HEADERS,
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Origin': 'https://www.ahtv.cn',
      },
    });
    
    if (!response.ok) {
      return [];
    }
    
    const channels = await response.json();
    
    // 构建频道数据数组
    const channelList: ChannelData[] = [];
    for (const channel of channels) {
      if (channel.m3u8 && channel.name) {
        channelList.push({
          id: channel.id,
          name: channel.name,
          m3u8: channel.m3u8,
        });
      }
    }
    
    // 更新缓存
    channelCache.set(cacheKey, {
      data: channelList,
      timestamp: now,
    });
    
    return channelList;
  } catch (error) {
    console.error('[Anhui] Error fetching channel list:', error);
    return [];
  }
}

/**
 * 根据ID查找频道
 */
function findChannel(channels: ChannelData[], id: string): ChannelData | null {
  // 先尝试友好ID映射 - 通过名称查找
  for (const [name, friendlyId] of Object.entries(CHANNEL_NAME_MAP)) {
    if (friendlyId === id) {
      return channels.find(ch => ch.name === name) || null;
    }
  }
  
  // 尝试直接通过数字ID查找
  if (/^\d+$/.test(id)) {
    const numericId = parseInt(id, 10);
    return channels.find(ch => ch.id === numericId) || null;
  }
  
  // 尝试通过名称直接查找
  return channels.find(ch => ch.name === id) || null;
}

/**
 * 提取二级 M3U8 路径
 */
function extractSecondM3U8(m3u8Content: string, baseUrl: string): string | null {
  const lines = m3u8Content.split('\n');
  const baseDomain = new URL(baseUrl).origin;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 跳过空行和注释
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }
    
    // 找到 .m3u8 文件
    if (trimmedLine.includes('.m3u8')) {
      if (trimmedLine.startsWith('http')) {
        return trimmedLine;
      } else {
        // 相对路径
        const basePath = baseUrl.substring(0, baseUrl.lastIndexOf('/'));
        return basePath + '/' + trimmedLine;
      }
    }
  }
  
  return null;
}

/**
 * 获取 M3U8 播放列表（全链路代理）
 */
async function getM3U8Playlist(channel: ChannelData, host: string, pathname: string): Promise<Response> {
  try {
    // 1. 使用频道的 M3U8 地址
    const m3u8Url = channel.m3u8;

    // 2. 获取一级 M3U8
    const firstM3U8Response = await fetch(m3u8Url, { headers: DEFAULT_HEADERS });
    if (!firstM3U8Response.ok) {
      return new NextResponse('Failed to fetch first M3U8', { status: 502 });
    }
    const firstM3U8 = await firstM3U8Response.text();

    // 3. 提取二级 M3U8 路径
    const secondM3U8Path = extractSecondM3U8(firstM3U8, m3u8Url);
    if (!secondM3U8Path) {
      return new NextResponse('Failed to extract second M3U8 path', { status: 502 });
    }

    // 4. 获取二级 M3U8
    const secondM3U8Response = await fetch(secondM3U8Path, { headers: DEFAULT_HEADERS });
    if (!secondM3U8Response.ok) {
      return new NextResponse('Failed to fetch second M3U8', { status: 502 });
    }
    let secondM3U8 = await secondM3U8Response.text();

    // 5. 代理 TS 文件
    const baseDomain = new URL(m3u8Url).origin;
    const secondM3U8Dir = secondM3U8Path.substring(0, secondM3U8Path.lastIndexOf('/'));
    const proxyBaseUrl = `http://${host}${pathname}?ts=`;
    
    const lines = secondM3U8.split('\n');
    const outputLines = lines.map(line => {
      const trimmedLine = line.trim();
      
      // 跳过空行和注释
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        return line;
      }
      
      // 处理 TS 文件
      if (trimmedLine.includes('.ts')) {
        let fullTsUrl: string;
        
        if (trimmedLine.startsWith('http')) {
          fullTsUrl = trimmedLine;
        } else if (trimmedLine.startsWith('/')) {
          fullTsUrl = baseDomain + trimmedLine;
        } else {
          fullTsUrl = secondM3U8Dir + '/' + trimmedLine;
        }
        
        return `${proxyBaseUrl}${encodeURIComponent(fullTsUrl)}`;
      }
      
      return line;
    });

    return new NextResponse(outputLines.join('\n'), {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[Anhui] Error:', error);
    return new NextResponse(`Internal server error: ${error}`, { status: 500 });
  }
}

/**
 * 代理 TS 文件
 */
async function proxyTSFile(tsUrl: string): Promise<Response> {
  try {
    // 验证 TS URL
    if (!tsUrl.includes('.ts')) {
      return new NextResponse('Invalid TS URL', { status: 403 });
    }

    const response = await fetch(tsUrl, { headers: DEFAULT_HEADERS });

    if (!response.ok) {
      return new NextResponse('Failed to fetch TS file', { status: 502 });
    }

    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'video/MP2T',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[Anhui] Error proxying TS:', error);
    return new NextResponse('Failed to proxy TS file', { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get('id') || 'list';
  const tsUrl = searchParams.get('ts');

  // 🔥 优先处理 TS 文件请求（避免被 channelId='list' 逻辑拦截）
  if (tsUrl) {
    return proxyTSFile(decodeURIComponent(tsUrl));
  }

  // 获取频道列表
  const channels = await getChannelList();

  if (channels.length === 0) {
    return new NextResponse('Failed to fetch channel data', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 如果请求频道列表
  if (channelId === 'list') {
    const host = getRealHost(request);
    const pathname = new URL(request.url).pathname;
    
    let m3u8Content = '#EXTM3U\n';
    
    for (const channel of channels) {
      // 使用名称映射生成友好ID
      const friendlyId = CHANNEL_NAME_MAP[channel.name] || `${channel.id}`;
      
      m3u8Content += `#EXTINF:-1,${channel.name}\n`;
      m3u8Content += `http://${host}${pathname}?id=${friendlyId}\n`;
    }
    
    return new NextResponse(m3u8Content, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Content-Disposition': 'inline; filename="anhui.m3u8"',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }

  // 查找指定频道
  const channel = findChannel(channels, channelId);
  
  if (!channel) {
    return new NextResponse('Channel not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 获取真实 host
  const host = getRealHost(request);
  const pathname = new URL(request.url).pathname;

  // 返回 M3U8 播放列表
  return getM3U8Playlist(channel, host, pathname);
}
