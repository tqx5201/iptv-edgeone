import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';

//export const runtime = 'edge';

interface ChannelInfo {
  channelId: string;
  channelName: string;
  dispatchUrl2: string;
}

interface PlayUrlData {
  playurl: {
    dispatch: Array<{
      url: Array<{
        [cdnName: string]: Array<any>;
      }>;
    }>;
  };
}

// 获取频道列表
async function getChannelList(): Promise<ChannelInfo[] | null> {
  try {
    const api = 'https://newsapp-api.cztv.com/portal/api/tvLive?clientVersion=1221&terminal=2';
    const response = await fetch(api, {
      headers: {
        'User-Agent': 'zhong guo lan xin wen/12.2.1 (iPhone; iOS 18.6.2; Scale/3.00)',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data?.data?.tvRadioChannelList) {
      return null;
    }

    return data.data.tvRadioChannelList as ChannelInfo[];
  } catch (error) {
    console.error('Failed to fetch channel list:', error);
    return null;
  }
}

// 解析播放地址
async function getPlayUrl(dispatchUrl2: string): Promise<string | null> {
  try {
    const response = await fetch(dispatchUrl2);
    if (!response.ok) {
      return null;
    }

    const data: PlayUrlData = await response.json();
    if (!data?.playurl?.dispatch?.[0]?.url) {
      return null;
    }

    const urlArr = data.playurl.dispatch[0].url;

    // 遍历所有 CDN 对象
    for (const cdnObj of urlArr) {
      if (!cdnObj || typeof cdnObj !== 'object') continue;

      // 遍历每个 CDN (ali_m3u8, tx_m3u8, yf_m3u8)
      for (const cdnName in cdnObj) {
        const cdnData = cdnObj[cdnName];
        if (!Array.isArray(cdnData)) continue;

        // 找 defaultrate
        let defaultRate = '';
        for (const item of cdnData) {
          if (item && typeof item === 'object' && item.defaultrate) {
            defaultRate = item.defaultrate;
            break;
          }
        }

        // 从第一个元素获取播放地址
        const firstItem = cdnData[0];
        if (firstItem && typeof firstItem === 'object') {
          // 使用 defaultrate 指定的清晰度
          if (defaultRate && firstItem[defaultRate]) {
            return firstItem[defaultRate];
          }

          // 降级: 取第一个可用的 m3u8 地址
          for (const key in firstItem) {
            const value = firstItem[key];
            if (typeof value === 'string' && value.includes('.m3u8')) {
              return value;
            }
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to parse play url:', error);
    return null;
  }
}

// 生成播放列表
function generatePlaylist(channels: ChannelInfo[], baseUrl: string): string {
  let m3u = '#EXTM3U\n';
  for (const channel of channels) {
    m3u += `#EXTINF:-1,${channel.channelName}\n`;
    m3u += `${baseUrl}/api/zhejiang1?id=${channel.channelId}\n`;
  }
  return m3u;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id') || '';
  const name = searchParams.get('name') || '';

  // 获取频道列表
  const channels = await getChannelList();
  if (!channels) {
    return new NextResponse('无法获取频道列表', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 如果是 list，生成播放清单
  if (id === 'list') {
    const realHost = getRealHost(request);
    const baseUrl = `${request.nextUrl.protocol}//${realHost}`;
    const playlist = generatePlaylist(channels, baseUrl);

    return new NextResponse(playlist, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // 查找频道
  const channel = channels.find(
    (ch) => (id && ch.channelId === id) || (name && ch.channelName === name)
  );

  if (!channel) {
    let errorMsg = '频道未找到\n\n支持的频道:\n';
    for (const ch of channels) {
      errorMsg += `${ch.channelId} - ${ch.channelName}\n`;
    }
    return new NextResponse(errorMsg, {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 获取播放地址
  if (!channel.dispatchUrl2) {
    return new NextResponse('频道无可用播放地址', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const m3u8Url = await getPlayUrl(channel.dispatchUrl2);
  if (!m3u8Url) {
    return new NextResponse('未找到可用m3u8地址', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 302 跳转到 m3u8
  return NextResponse.redirect(m3u8Url, 302);
}
