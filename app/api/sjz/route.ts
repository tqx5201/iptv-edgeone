/**
 * 石家庄TV API路由
 * 支持石家庄电视台频道
 * Edge Runtime
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';

//export const runtime = 'edge';

const API_URL = 'http://mapi.sjzntv.cn/api/v1/channel.php';

/**
 * 获取播放地址
 */
async function getStreamUrl(id: string): Promise<string | null> {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) return null;

    // 直接解析JSON
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      return null;
    }

    // 查找匹配的频道
    for (const item of data) {
      if (item.id && String(item.id) === String(id)) {
        if (item.m3u8) {
          // JSON反转义
          return item.m3u8.replace(/\\\//g, '/');
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Get stream URL error:', error);
    return null;
  }
}

/**
 * GET请求处理
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || '4';

  if (id === 'list') {
    try {
      // 获取频道列表
      const response = await fetch(API_URL);
      if (!response.ok) {
        return new NextResponse('Failed to fetch channel list', {
          status: 500,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        return new NextResponse('Invalid channel list format', {
          status: 500,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }

      // 构建M3U8播放列表
      let m3u8Content = '#EXTM3U\n';
      
      // 获取真实域名
      const host = getRealHost(request);
      const protocol = request.url.startsWith('https') ? 'https' : 'http';
      const baseUrl = `${protocol}://${host}/api/sjz`;

      for (const channel of data) {
        if (channel.id && channel.name) {
          m3u8Content += `#EXTINF:-1,${channel.name}\n`;
          m3u8Content += `${baseUrl}?id=${channel.id}\n`;
        }
      }

      return new NextResponse(m3u8Content, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (error) {
      console.error('List generation error:', error);
      return new NextResponse('Failed to generate channel list', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  }

  // 获取播放地址
  const streamUrl = await getStreamUrl(id);

  if (!streamUrl) {
    return new NextResponse(`Channel not found: ${id}`, {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 302重定向到播放地址
  return NextResponse.redirect(streamUrl, 302);
}
