import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';

/**
 * 青海广播电视台直播源代理
 * 通过官方 API 获取播放地址
 */

// 频道配置
const CHANNEL_MAP: Record<string, { id: string; secret: string; tenantId: number; name: string }> = {
  qhws: {
    id: '786181204964564992',
    secret: '32a2c3b4f1b52c58119457d44acdcd49',
    tenantId: 1075,
    name: '青海卫视'
  },
  qhjs: {
    id: '786227316454875136',
    secret: '32a2c3b4f1b52c58119457d44acdcd49',
    tenantId: 1075,
    name: '青海经视'
  },
  qhds: {
    id: '786227009616371712',
    secret: '32a2c3b4f1b52c58119457d44acdcd49',
    tenantId: 1075,
    name: '青海都市'
  },
  adws: {
    id: '824587377543962624',
    secret: '069486993db4acc22c846557c8880d9a',
    tenantId: 1077,
    name: '安多卫视'
  }
};

/**
 * 获取播放地址
 */
async function getPlayUrl(channelId: string): Promise<string | null> {
  const channel = CHANNEL_MAP[channelId];
  if (!channel) return null;

  try {
    const apiUrl = `https://mapi.qhbtv.com.cn/cloudlive-manage-mapi/api/topic/detail?preview=&id=${channel.id}&app_secret=${channel.secret}&tenant_id=0&company_id=${channel.tenantId}&lang_type=zh`;

    const response = await fetch(apiUrl, {
      headers: {
        'Referer': 'https://mapi.qhbtv.com.cn/'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch play URL:', response.status);
      return null;
    }

    const data = await response.json();
    
    // 从 API 响应中提取播放地址
    const playUrl = data?.topic_camera?.[0]?.streams?.[0]?.hls;
    
    if (!playUrl) {
      console.error('Play URL not found in response');
      return null;
    }

    return playUrl;
  } catch (error) {
    console.error('Get play URL error:', error);
    return null;
  }
}

/**
 * 生成播放列表
 */
function generatePlaylist(baseUrl: string): string {
  let m3u8 = '#EXTM3U\n';
  for (const [id, channel] of Object.entries(CHANNEL_MAP)) {
    m3u8 += `#EXTINF:-1,${channel.name}\n`;
    m3u8 += `${baseUrl}?id=${id}\n`;
  }
  return m3u8;
}

/**
 * GET 请求处理
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || 'list';

  // 返回播放列表
  if (id === 'list') {
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = getRealHost(request);
    const baseUrl = `${protocol}://${host}/api/qinghai`;

    const playlist = generatePlaylist(baseUrl);
    return new NextResponse(playlist, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8'
      }
    });
  }

  // 验证频道ID
  if (!CHANNEL_MAP[id]) {
    const supportedChannels = Object.keys(CHANNEL_MAP).join(', ');
    return new NextResponse(
      `错误：频道 '${id}' 不存在。\n\n支持的频道列表：\n${supportedChannels}`,
      { 
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      }
    );
  }

  // 获取播放地址
  const playUrl = await getPlayUrl(id);
  
  if (!playUrl) {
    return new NextResponse('获取播放地址失败', { status: 500 });
  }

  // 302 重定向到真实播放地址
  return NextResponse.redirect(playUrl, 302);
}

//export const runtime = 'edge';
