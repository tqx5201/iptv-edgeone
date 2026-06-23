import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';

/**
 * 福建TV API路由
 * 支持福建电视台频道（动态）
 * Edge Runtime
 */

//export const runtime = 'edge';

const API_BASE_URL = 'https://live.fjtv.net/m2o/channel/channel_info.php';

// 频道名称到友好ID的映射
const CHANNEL_NAME_MAP: Record<string, string> = {
  '综合频道': 'fjzh',
  '东南卫视': 'fjws',
  '乡村振兴·公共频道': 'fjgg',
  '新闻频道': 'fjxw',
  '电视剧频道': 'fjdsj',
  '旅游频道': 'fjly',
  '经济生活频道': 'fjjj',
  '文体频道': 'fjwt',
  '少儿频道': 'fjse',
  '海峡卫视': 'hxws',
};

// 友好ID到数字ID的映射（参考fujian.php）
const ID_MAP: Record<string, number> = {
  'fjzh': 4,    // 综合频道
  'fjws': 5,    // 东南卫视
  'fjgg': 6,    // 公共频道（现为乡村振兴·公共频道）
  'fjxw': 13,   // 新闻频道
  'fjdsj': 7,   // 电视剧频道
  'fjly': 8,    // 旅游频道
  'fjjj': 9,    // 经济生活频道
  'fjwt': 10,   // 文体频道
  'fjse': 2,    // 少儿频道
  'hxws': 3,    // 海峡卫视
};

interface ChannelData {
  id: string;
  name: string;
  m3u8: string;
  numericId: number;
}

// 缓存配置（Edge Runtime 使用内存缓存）
const channelCache = new Map<string, { data: ChannelData[]; timestamp: number }>();
const CACHE_TTL = 600 * 1000; // 10分钟

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
  
  // 获取所有频道列表
  const channelIds = Object.values(ID_MAP);
  const channelList: ChannelData[] = [];
  
  try {
    // 并行获取所有频道信息
    const promises = channelIds.map(async (numericId) => {
      try {
        const response = await fetch(`${API_BASE_URL}?channel_id=${numericId}`);
        if (!response.ok) return null;
        
        const data = await response.json();
        if (!data || !Array.isArray(data) || data.length === 0) return null;
        
        const channelInfo = data[0];
        if (!channelInfo.m3u8 || !channelInfo.name) return null;
        
        return {
          id: channelInfo.id,
          name: channelInfo.name,
          m3u8: channelInfo.m3u8,
          numericId: numericId,
        };
      } catch (error) {
        console.error(`[Fujian] Error fetching channel ${numericId}:`, error);
        return null;
      }
    });
    
    const results = await Promise.all(promises);
    
    // 过滤掉失败的请求
    for (const result of results) {
      if (result) {
        channelList.push(result);
      }
    }
    
    // 更新缓存
    if (channelList.length > 0) {
      channelCache.set(cacheKey, {
        data: channelList,
        timestamp: now,
      });
    }
    
    return channelList;
  } catch (error) {
    console.error('[Fujian] Error fetching channel list:', error);
    return [];
  }
}

/**
 * 根据ID查找频道
 */
function findChannel(channels: ChannelData[], id: string): ChannelData | null {
  // 先尝试友好ID映射
  const numericId = ID_MAP[id];
  if (numericId !== undefined) {
    return channels.find(ch => ch.numericId === numericId) || null;
  }
  
  // 尝试直接通过数字ID查找
  if (/^\d+$/.test(id)) {
    const num = parseInt(id, 10);
    return channels.find(ch => ch.numericId === num) || null;
  }
  
  // 尝试通过名称直接查找
  return channels.find(ch => ch.name === id) || null;
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
    const baseUrl = `${protocol}://${host}/api/fujian`;

    for (const channel of channels) {
      const friendlyId = CHANNEL_NAME_MAP[channel.name] || `ch${channel.numericId}`;

      m3u8Content += `#EXTINF:-1,${channel.name}\n`;
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

  if (!channel || !channel.m3u8) {
    return new NextResponse('Channel not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 302重定向到实际流地址
  return NextResponse.redirect(channel.m3u8, 302);
}
