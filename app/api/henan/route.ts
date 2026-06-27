/**
 * 河南TV API路由
 * 支持河南及地区的广播电视台频道
 * Edge Runtime
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';

//export const runtime = 'edge';

// 频道映射表

const CHANNEL_MAP: Record<string, [number, string]> = {
  hnws: [145, '河南卫视'],
  hnds: [141, '河南都市'],
  hnms: [146, '河南民生'],
  hmfz: [147, '河南法治'],
  hndsj: [148, '河南电视剧'],
  hnxw: [149, '河南新闻'],
  htgw: [150, '欢腾购物'],
  hngg: [151, '河南公共'],
  hnxc: [152, '河南乡村'],
  hngj: [153, '河南国际'],
  hnly: [154, '河南梨园'],
  wwbk: [155, '文物宝库'],
  wspd: [156, '武术世界'],
  jczy: [157, '睛彩中原'],
  ydxj: [163, '移动戏曲'],
  xsj: [183, '象视界'],
  gxpd: [194, '国学频道'],
  zz1: [197, '郑州新闻综合'],
  kf1: [198, '开封新闻综合'],
  ly1: [204, '洛阳新闻综合'],
  pds1: [205, '平顶山新闻综合'],
  ay1: [206, '安阳新闻综合'],
  hb1: [207, '鹤壁新闻综合'],
  xx1: [208, '新乡新闻综合'],
  jz1: [209, '焦作新闻综合'],
  py1: [219, '濮阳新闻综合'],
  xc1: [220, '许昌新闻综合'],
  lh1: [221, '漯河新闻综合'],
  smx1: [222, '三门峡新闻综合'],
  ny1: [223, '南阳新闻综合'],
  sq1: [224, '商丘新闻综合'],
  xy1: [225, '信阳新闻综合'],
  zk1: [226, '周口新闻综合'],
  zmd1: [227, '驻马店新闻综合'],
  jy1: [228, '济源新闻综合']
}



const SIGN_SECRET = '6ca114a836ac7d73';
//const API_URL = 'https://pubmod.hntv.tv/program/getAuth/live/class/program/11';
const API_URL = `https://pubmod.hntv.tv/program/getAuth/channel/channelIds/1/`;



/**
 * SHA256哈希
 */
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 获取播放地址
 */
async function getStreamUrl(cid: number): Promise<string | null> {
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = await sha256(SIGN_SECRET + timestamp);

  try {
    const response = await fetch(API_URL+cid, {
      headers: {
        'timestamp': timestamp.toString(),
        'sign': sign,
        'Referer': 'https://static.hntv.tv',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();

    if (!Array.isArray(data)) return null;


	if (data && data.length > 0 && 
		data[0].video_streams && 
		data[0].video_streams.length > 0) {
		
		const playUrl = data[0].video_streams[0];
		
		// 返回播放地址
		return playUrl;
	} else {
		return null;
	}

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
  const id = searchParams.get('id') || 'hnws';

  // 如果是list请求，返回频道列表
  if (id === 'list') {
    let m3u8Content = '#EXTM3U\n';
    
    // 获取真实域名
    const host = getRealHost(request);
    const protocol = request.url.startsWith('https') ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}/api/henan`;

    for (const [key, [id, name]] of Object.entries(CHANNEL_MAP)) {
      const channelName = name;
      m3u8Content += `#EXTINF:-1,${channelName}\n`;
      m3u8Content += `${baseUrl}?id=${key}\n`;
    }

    return new NextResponse(m3u8Content, {
      headers: {
        //'Content-Type': 'application/vnd.apple.mpegurl',
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // 检查频道是否存在
  if (!CHANNEL_MAP[id]) {
    return new NextResponse(
      `Channel not found: ${id}\nAvailable channels: ${Object.keys(CHANNEL_MAP).join(', ')}`,
      {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }
    );
  }

  const cid = CHANNEL_MAP[id][0];

  // 获取播放地址
  const streamUrl = await getStreamUrl(cid);

  if (!streamUrl) {
    return new NextResponse('Stream not found or channel unavailable', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 处理RTMP协议
  if (streamUrl.startsWith('rtmp://')) {
    // 如果请求M3U文件
    if (searchParams.get('m3u')) {
      const m3uContent = `#EXTM3U\n#EXTINF:-1,${CHANNEL_NAMES[id]}\n${streamUrl}\n`;
      return new NextResponse(m3uContent, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Content-Disposition': `attachment; filename="${id}.m3u"`,
        },
      });
    }

    // 返回提示信息
    return new NextResponse(
      `This channel uses RTMP protocol which is not supported in browsers.\nRTMP URL: ${streamUrl}\nTo download M3U file, add ?m3u=1 parameter`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }
    );
  }

  // 302重定向到播放地址
  return NextResponse.redirect(streamUrl, 302);
}
