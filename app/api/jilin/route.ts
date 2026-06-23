/**
 * 吉林TV API路由
 * 支持吉林电视台频道（动态）
 * Edge Runtime
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';
import { xxteaDecrypt } from '../utils/crypto';

//export const runtime = 'edge';

const API_URL = 'https://clientapi.jlntv.cn/broadcast/list?page=1&size=10000&type=1';
const XXTEA_KEY = '5b28bae827e651b3';

// 频道名称到友好ID的映射
const CHANNEL_NAME_MAP: Record<string, string> = {
  '吉林卫视': 'jlws',
  '都市频道': 'jlds',
  '生活频道': 'jlsh',
  '影视频道': 'jlys',
  '乡村频道': 'jlxc',
  '综艺·文化频道': 'jlzywh',
  '延边卫视': 'ybws',
  '长春综合': 'cczh',
  '吉林新闻综合': 'jlszh',
  '四平新闻综合': 'spzh',
  '辽源新闻综合': 'lyzh',
  '通化新闻综合': 'thzh',
  '白山新闻综合': 'bszh',
  '白城新闻综合': 'bczh',
  '松原新闻综合': 'syzh',
};

// 友好ID到数字ID的映射
const ID_MAP: Record<string, number> = {
  'jlws': 2,
  'jlds': 3,
  'jlsh': 4,
  'jlys': 5,
  'jlxc': 6,
  'jlzywh': 8,
  'ybws': 22,
  'cczh': 31,
  'jlszh': 23,
  'spzh': 24,
  'lyzh': 25,
  'thzh': 26,
  'bszh': 29,
  'bczh': 27,
  'syzh': 28,
};

interface ChannelData {
  id: number;
  title?: string;
  name?: string;
  streamUrl?: string;
}

interface ApiResponse {
  code: number;
  data: Array<{
    data: ChannelData;
  }>;
}

/**
 * 获取并解密频道数据
 */
async function getChannelList(): Promise<ChannelData[]> {
  try {
    const response = await fetch(API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1)',
      },
    });

    if (!response.ok) return [];

    let encryptedData = await response.text();
    // 移除引号
    encryptedData = encryptedData.replace(/"/g, '');

    // XXTEA解密
    const decryptedStr = xxteaDecrypt(encryptedData, XXTEA_KEY);
    
    // 解析JSON
    const jsonData: ApiResponse = JSON.parse(decryptedStr);

    if (!jsonData.data || !Array.isArray(jsonData.data)) {
      return [];
    }

    // 提取频道数据
    const channels: ChannelData[] = [];
    for (const item of jsonData.data) {
      if (item.data) {
        channels.push(item.data);
      }
    }

    return channels;
  } catch (error) {
    console.error('Get channel list error:', error);
    return [];
  }
}

/**
 * 根据ID查找频道
 */
function findChannel(channels: ChannelData[], id: string): ChannelData | null {
  // 先尝试友好ID映射
  let numericId = ID_MAP[id];

  // 如果不是友好ID，尝试直接作为数字ID
  if (numericId === undefined) {
    if (/^\d+$/.test(id)) {
      numericId = parseInt(id, 10);
    } else if (id.startsWith('ch')) {
      numericId = parseInt(id.substring(2), 10);
    }
  }

  if (numericId === undefined) {
    return null;
  }

  // 查找匹配的频道
  return channels.find(ch => ch.id === numericId) || null;
}

/**
 * GET请求处理
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || 'list';

  // 获取频道列表
  const channels = await getChannelList();

  if (channels.length === 0) {
    return new NextResponse('Failed to fetch channel data', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 如果请求频道列表
  if (id === 'list') {
    // 构建M3U8播放列表
    let m3u8Content = '#EXTM3U\n';

    // 获取真实域名
    const host = getRealHost(request);
    const protocol = request.url.startsWith('https') ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}/api/jilin`;

    for (const channel of channels) {
      const name = channel.title || channel.name || '';
      if (!name) continue;

      // 使用名称映射生成友好ID
      const friendlyId = CHANNEL_NAME_MAP[name] || `ch${channel.id}`;

      m3u8Content += `#EXTINF:-1,${name}\n`;
      m3u8Content += `${baseUrl}?id=${friendlyId}\n`;
    }

    return new NextResponse(m3u8Content, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }

  // 播放指定频道
  const channel = findChannel(channels, id);

  if (!channel || !channel.streamUrl) {
    return new NextResponse('Channel not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 302重定向到实际流地址
  return NextResponse.redirect(channel.streamUrl, 302);
}
