import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';

//export const runtime = 'edge';

const API_URL = 'https://web.cbg.cn/live/getLiveUrl?url=https://sjlivecdn.cbg.cn/app_2/_definst_/ls_3.stream/chunklist.m3u8';

// 频道配置（虽然目前只有一个频道，但保持统一格式）
const CHANNELS: Record<string, string> = {
  cqxw: '重庆新闻',
};

export async function GET(request: NextRequest) {
  const urlObj = new URL(request.url);
  const searchParams = urlObj.searchParams;
  const id = searchParams.get('id') || 'cqxw';

  // ===== ?id=list 返回频道列表 =====
  if (id === 'list') {
    const host = getRealHost(request);
    const protocol = request.url.startsWith('https') ? 'https' : 'http';
    const selfUrl = `${protocol}://${host}${urlObj.pathname}`;
    
    let m3u = '#EXTM3U\n';
    for (const [cid, cname] of Object.entries(CHANNELS)) {
      m3u += `#EXTINF:-1,${cname}\n`;
      m3u += `${selfUrl}?id=${cid}\n`;
    }
    return new NextResponse(m3u, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // ===== 获取实际播放地址并302重定向 =====
  if (id !== 'cqxw') {
    return new NextResponse(`错误: 未知频道ID "${id}"`, { status: 400 });
  }

  try {
    const resp = await fetch(API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store',
    });

    if (!resp.ok) {
      return new NextResponse(`错误: API请求失败 (HTTP ${resp.status})`, { status: 502 });
    }

    const data = await resp.json();
    const m3u8Url = data?.data?.url;

    if (!m3u8Url) {
      return new NextResponse('错误: API返回的数据中未找到播放地址', { status: 404 });
    }

    // 302重定向到实际播放地址
    return NextResponse.redirect(m3u8Url, 302);
  } catch (err) {
    return new NextResponse(`错误: ${err}`, { status: 500 });
  }
}
