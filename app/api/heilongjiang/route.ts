import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';

//export const runtime = 'edge';

/**
 * 黑龙江电视台直播代理
 * 数据源: https://www.dbw.cn/zhibodan/zhibo_dan/
 * 通过解析页面获取频道列表和 m3u8 地址
 * 使用 302 重定向
 */

// 频道配置表 (短ID => 页面路径)
const CHANNEL_MAP: Record<string, { name: string; path: string }> = {
  'hljws': { name: '黑龙江卫视', path: 'hljws' },
  'hljds': { name: '都市频道', path: 'hljds' },
  'hljys': { name: '影视频道', path: 'hljys' },
  'hljwt': { name: '文体频道', path: 'hljwt' },
  'hljnykj': { name: '农业·科教频道', path: 'hljnykj' },
  'hljxwfz': { name: '新闻法治频道', path: 'heilongjiang' },
  'hljse': { name: '少儿频道', path: 'hljse' }
};

// 频道列表缓存
interface Channel {
  id: string;
  name: string;
  path: string;
  url: string;
}

/**
 * 获取频道列表 (使用静态配置)
 */
async function getChannelList(): Promise<Record<string, Channel>> {
  // 使用静态配置,不需要动态抓取
  const channels: Record<string, Channel> = {};
  
  for (const [id, config] of Object.entries(CHANNEL_MAP)) {
    channels[id] = {
      id,
      name: config.name,
      path: config.path,
      url: `https://www.dbw.cn/zhibodan/zhibo_dan/${config.path}/`
    };
  }
  
  return channels;
}

/**
 * 从频道页面获取 m3u8 播放地址
 */
async function getStreamUrl(path: string): Promise<string | null> {
  const channelUrl = `https://www.dbw.cn/zhibodan/zhibo_dan/${path}/`;

  try {
    const response = await fetch(channelUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch channel page: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // 从 config 对象中提取 url
    // 匹配: "url": "https://idclive.hljtv.com:4430/live/hljws_own.m3u8"
    let match = html.match(/"url"\s*:\s*"([^"]+\.m3u8)"/);
    if (match) return match[1];

    // 备用方法: 匹配 src: 或 file:
    match = html.match(/(?:src|file)\s*:\s*["']([^"']+\.m3u8)["']/);
    if (match) return match[1];

    // 最后尝试: 直接匹配所有 .m3u8 链接
    match = html.match(/https?:\/\/[^\s"']+\.m3u8/);
    if (match) return match[0];

    console.error(`Failed to extract m3u8 URL from: ${channelUrl}`);
    return null;
  } catch (error) {
    console.error('Error fetching stream URL:', error);
    return null;
  }
}

/**
 * 生成 M3U8 播放列表
 */
function generatePlaylist(channels: Record<string, Channel>, baseUrl: string): string {
  let m3u8 = '#EXTM3U\n';

  for (const channel of Object.values(channels)) {
    m3u8 += `#EXTINF:-1,${channel.name}\n`;
    m3u8 += `${baseUrl}?id=${channel.id}\n`;
  }

  return m3u8;
}

/**
 * GET 请求处理
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || 'list';

  // 获取频道列表
  const channels = await getChannelList();

  if (Object.keys(channels).length === 0) {
    return new NextResponse('Failed to load channel list', { status: 503 });
  }

  // 返回播放列表
  if (id === 'list') {
    const host = getRealHost(request);
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}/api/heilongjiang`;

    const playlist = generatePlaylist(channels, baseUrl);

    return new NextResponse(playlist, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }

  // 检查频道是否存在
  if (!channels[id]) {
    return new NextResponse(`Channel not found: ${id}`, { status: 404 });
  }

  const channel = channels[id];
  const path = channel.path;

  // 获取播放地址
  const streamUrl = await getStreamUrl(path);

  if (!streamUrl) {
    return new NextResponse(`Failed to get stream URL for channel: ${channel.name}`, { 
      status: 502 
    });
  }

  // 302 重定向到播放地址
  return NextResponse.redirect(streamUrl, 302);
}
