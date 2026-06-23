/**
 * 北京TV API路由
 * 支持10个北京广播电视台频道
 * Edge Runtime
 */

import { NextRequest, NextResponse } from 'next/server';
import { md5 } from '../utils/crypto';
import { getRealHost } from '../utils/url';

//export const runtime = 'edge';

// 频道映射表
const CHANNEL_MAP: { [key: string]: string } = {
  'bjws': '573ib1kp5nk92irinpumbo9krlb',    // 北京卫视
  'bjwy': '54db6gi5vfj8r8q1e6r89imd64s',    // BRTV文艺
  'bjjskj': '53bn9rlalq08lmb8nf8iadoph0b',  // BRTV纪实科教
  'bjys': '50mqo8t4n4e8gtarqr3orj9l93v',    // BRTV影视
  'bjcj': '50e335k9dq488lb7jo44olp71f5',    // BRTV财经
  'bjsh': '50j015rjrei9vmp3h8upblr41jf',    // BRTV生活
  'bjxw': '53gpt1ephlp86eor6ahtkg5b2hf',    // BRTV新闻
  'bjkk': '55skfjq618b9kcq9tfjr5qllb7r',    // 卡酷少儿
  'bjws4k': '5755n511tbk8flo40l4c71l0sdf',  // 北京卫视4K
  'bjty': '54hv0f3pq079d4oiil2k12dkvsc',    // BRTV体育休闲
};

// 频道名称映射
const CHANNEL_NAMES: { [key: string]: string } = {
  'bjws': '北京卫视',
  'bjwy': 'BRTV文艺',
  'bjjskj': 'BRTV纪实科教',
  'bjys': 'BRTV影视',
  'bjcj': 'BRTV财经',
  'bjsh': 'BRTV生活',
  'bjxw': 'BRTV新闻',
  'bjkk': '卡酷少儿',
  'bjws4k': '北京卫视4K',
  'bjty': 'BRTV体育休闲',
};

const SIGN_SECRET = 'TtJSg@2g*$K4PjUH';

/**
 * Base64解码
 */
function base64Decode(str: string): string {
  try {
    return atob(str);
  } catch {
    return '';
  }
}

/**
 * 反转字符串
 */
function reverseString(str: string): string {
  return str.split('').reverse().join('');
}

/**
 * 获取播放地址
 */
async function getStreamUrl(channelId: string): Promise<string | null> {
  // 生成签名
  const timestamp = Math.floor(Date.now() / 1000);
  const signStr = `${channelId}151${timestamp}${SIGN_SECRET}`;
  const signFull = md5(signStr);
  const sign = signFull.substring(0, 8);

  // 构建API URL
  const apiUrl = `https://pc.api.btime.com/video/play?from=pc&callback=&id=${channelId}&type_id=151&timestamp=${timestamp}&sign=${sign}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Referer': 'https://www.brtn.cn/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) return null;

    const text = await response.text();

    // 提取stream_url
    const match = text.match(/"stream_url"\s*:\s*"([^"]+)"/);
    if (!match) return null;

    const encryptedUrl = match[1];

    // 解密URL: 反转字符串 -> base64解码 -> 再次base64解码
    const reversed = reverseString(encryptedUrl);
    const decoded1 = base64Decode(reversed);
    const decoded2 = base64Decode(decoded1);

    return decoded2 || null;
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
  const id = searchParams.get('id') || 'bjws';

  // 如果是list请求，返回频道列表
  if (id === 'list') {
    let m3u8Content = '#EXTM3U\n';
    
    // 获取真实域名
    const host = getRealHost(request);
    const protocol = request.url.startsWith('https') ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}/api/beijing`;

    for (const [cid, _] of Object.entries(CHANNEL_MAP)) {
      const channelName = CHANNEL_NAMES[cid];
      m3u8Content += `#EXTINF:-1,${channelName}\n`;
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
  if (!CHANNEL_MAP[id]) {
    return new NextResponse(`Channel not found: ${id}\nAvailable channels: ${Object.keys(CHANNEL_MAP).join(', ')}`, {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const channelId = CHANNEL_MAP[id];

  // 获取播放地址
  const streamUrl = await getStreamUrl(channelId);

  if (!streamUrl) {
    return new NextResponse('Stream not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 302重定向到播放地址
  return NextResponse.redirect(streamUrl, 302);
}
