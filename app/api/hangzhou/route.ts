import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';

//export const runtime = 'edge';

/**
 * 杭州电视台直播代理 (Hoolo TV)
 * 特点: 全链路代理 (m3u8 + ts)
 * 数据源: https://mapi.hoolo.tv/
 */

interface ChannelInfo {
  id: string;
  channelId: number;
  name: string;
  streamIndex: number; // 使用 channel_stream 的索引 (0 或 1)
}

// 频道配置
const CHANNELS: Record<string, ChannelInfo> = {
  'hzzh': { id: 'hzzh', channelId: 16, name: '杭州综合', streamIndex: 1 },
  'hzmz': { id: 'hzmz', channelId: 17, name: '西湖明珠', streamIndex: 1 },
  'hzsh': { id: 'hzsh', channelId: 18, name: '杭州生活', streamIndex: 1 },
  'hzys': { id: 'hzys', channelId: 21, name: '杭州影视', streamIndex: 1 },
  'hzqsty': { id: 'hzqsty', channelId: 20, name: '青少体育', streamIndex: 1 },
  'hzds': { id: 'hzds', channelId: 22, name: '杭州导视', streamIndex: 1 },
  'fyxwzh': { id: 'fyxwzh', channelId: 32, name: '富阳新闻综合', streamIndex: 0 },
};

/**
 * 获取频道播放地址
 */
async function getChannelStream(channelId: number, streamIndex: number): Promise<string | null> {
  try {
    const url = `https://mapi.hoolo.tv/api/v1/channel_detail.php?channel_id=${channelId}`;
    const response = await fetch(url, {
      headers: {
        'Referer': 'https://tv.hoolo.tv/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const channelStream = data[0]?.channel_stream?.[streamIndex]?.m3u8;
    if (!channelStream) {
      return null;
    }

    return channelStream;
  } catch (error) {
    console.error('Failed to get channel stream:', error);
    return null;
  }
}

/**
 * 获取并代理 m3u8 内容
 */
async function getM3u8Content(m3u8Url: string, baseUrl: string, channelId: string): Promise<string | null> {
  try {
    const response = await fetch(m3u8Url, {
      headers: {
        'Referer': 'https://tv.hoolo.tv/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return null;
    }

    let content = await response.text();
    
    // 获取 m3u8 的 base URL (用于处理相对路径)
    const m3u8BaseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);
    const urlObj = new URL(m3u8Url);
    const protocol = urlObj.protocol.replace(':', '');
    const host = urlObj.host;

    // 替换 ts 文件路径为代理路径
    // 匹配完整的 ts 行，包括可能的查询参数
    content = content.replace(/^(.*?\.ts[^\s]*)$/gim, (match) => {
      let tsUrl = match.trim();
      
      if (tsUrl.startsWith('http://') || tsUrl.startsWith('https://')) {
        // 已经是完整 URL
        // 不做处理
      } else if (tsUrl.startsWith('/')) {
        // 绝对路径，拼接协议和域名
        tsUrl = `${urlObj.protocol}//${urlObj.host}${tsUrl}`;
      } else {
        // 相对路径，拼接 baseUrl
        tsUrl = m3u8BaseUrl + tsUrl;
      }
      
      // 编码 ts URL
      const encodedTs = encodeURIComponent(tsUrl);
      return `${baseUrl}/api/hangzhou?id=${channelId}&ts=${encodedTs}`;
    });

    return content;
  } catch (error) {
    console.error('Failed to get m3u8 content:', error);
    return null;
  }
}

/**
 * 代理 TS 切片
 */
async function proxyTsSegment(tsUrl: string): Promise<Response> {
  try {
    const response = await fetch(tsUrl, {
      headers: {
        'Referer': 'https://tv.hoolo.tv/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return new NextResponse('TS segment not found', { status: 404 });
    }

    const headers = new Headers({
      'Content-Type': 'video/MP2T',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    });

    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Failed to proxy TS segment:', error);
    return new NextResponse('Failed to fetch TS segment', { status: 500 });
  }
}

/**
 * 生成播放列表
 */
function generatePlaylist(baseUrl: string): string {
  let m3u = '#EXTM3U\n';
  for (const [id, channel] of Object.entries(CHANNELS)) {
    m3u += `#EXTINF:-1,${channel.name}\n`;
    m3u += `${baseUrl}/api/hangzhou?id=${id}\n`;
  }
  return m3u;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id') || '';
  const ts = searchParams.get('ts') || '';

  const realHost = getRealHost(request);
  const baseUrl = `${request.nextUrl.protocol}//${realHost}`;

  // 如果是 ts 代理请求
  if (ts) {
    const tsUrl = decodeURIComponent(ts);
    return proxyTsSegment(tsUrl);
  }

  // 如果是 list，生成播放清单
  if (id === 'list') {
    const playlist = generatePlaylist(baseUrl);
    return new NextResponse(playlist, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // 查找频道
  const channel = CHANNELS[id];
  if (!channel) {
    let errorMsg = '频道未找到\n\n支持的频道:\n';
    for (const [cid, ch] of Object.entries(CHANNELS)) {
      errorMsg += `${cid} - ${ch.name}\n`;
    }
    return new NextResponse(errorMsg, {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 获取频道流地址
  const m3u8Url = await getChannelStream(channel.channelId, channel.streamIndex);
  if (!m3u8Url) {
    return new NextResponse('无法获取频道流地址', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 获取并代理 m3u8 内容
  const m3u8Content = await getM3u8Content(m3u8Url, baseUrl, id);
  if (!m3u8Content) {
    return new NextResponse('无法获取m3u8内容', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 返回代理后的 m3u8
  return new NextResponse(m3u8Content, {
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    },
  });
}
