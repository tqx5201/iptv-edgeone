import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';

//export const runtime = 'edge';

// 长江云 site_id 配置表（43个地区）
const CJYUN_SITES: Record<string, string> = {
  '10013': '罗田',
  '10063': '红安',
  '10064': '房县',
  '10070': '恩施',
  // '10081': '丹江口',    // ❌ API无数据
  '10088': '公安',
  '10090': '江陵',
  '10091': '宜昌',
  // '10093': '利川',      // ❌ 源服务器故障 (0% 成功率, 502错误)
  '10094': '建始',        // ⚠️ 部分可用 (8.3% 成功率)
  '10095': '巴东',
  '10096': '咸丰',
  // '10097': '宣恩',      // ❌ 源服务器故障 (0% 成功率, 502错误)
  '10098': '鄂州',
  // '10099': '来凤',      // ❌ 源服务器故障 (0% 成功率, 连接失败+502)
  // '10100': '鹤峰',      // ❌ 源服务器故障 (0% 成功率, 502错误)
  // '10101': '荆门',      // ❌ API无数据（使用独立荆门广电API）
  '10102': '大冶',
  // '10103': '钟祥',      // ❌ API无数据
  '10104': '阳新',
  '10106': '远安',
  '10107': '武穴',
  // '10111': '秭归',      // ❌ API无数据
  // '10112': '五峰',      // ❌ 源服务器故障 (0% 成功率, 502错误)
  '10113': '团风',
  '10114': '长阳',
  // '10116': '谷城',      // ❌ 源服务器故障 (0% 成功率, 500错误)
  '10118': '当阳',
  '10120': '黄冈',
  '10125': '襄阳',
  '10126': '蕲春',
  '10128': '孝昌',
  // '10129': '大悟',      // ❌ API无数据
  '10130': '云梦',
  '10131': '嘉鱼',
  '10134': '通山',
  '10135': '应城',
  '10138': '赤壁',
  '10139': '孝感',
  '10140': '咸宁',
  // '10144': '神农架',    // ❌ API无数据
  // '10145': '随州',      // ❌ 源服务器故障 (0% 成功率, 404错误)
  '10146': '广水',
  '10174': '夷陵',
  // '10194': '松滋',      // ❌ API无数据
};

// 播放列表缓存配置
const PLAYLIST_CACHE_TTL = 3600; // 缓存1小时（秒）
let playlistCache: {
  data: string;
  timestamp: number;
} | null = null;

let playlistCacheAll: {
  data: string;
  timestamp: number;
} | null = null;

// 可用频道配置（严格测试后的真实可播放频道）
// 测试标准：302重定向正常 + M3U8内容有效 + TS切片可下载
const AVAILABLE_CHANNELS = {
  // 长江云地区（site_id格式）
  cjyun: {
    '10091': [59, 60], // 宜昌 - 2个 ✅
    '10102': [4, 65], // 大冶 - 2个 ✅
    '10118': [64], // 当阳 - 1个 ✅
    '10135': [43, 51], // 应城 - 2个 ✅
    '10139': [62, 63], // 孝感 - 2个 ✅
    '10140': [91, 80], // 咸宁 - 2个 ✅
    //'10134': [1], // 通山 - 1个 ✅
    '10125': [558], // 襄阳 - 1个 ✅ (综合广播)
    // 以下已移除（测试失败）：
    // '10094': [40], // 建始 - M3U8格式错误(4367B HTML页面) ❌
    // '10120': [2], // 黄冈 - M3U8是404错误页面 ❌
    // '10063': [355], // 红安 - M3U8是404错误页面 ❌
  },
  // 恩施特别API（9个全部可播放）✅
  enshi: [1, 2, 22, 31, 36, 33, 37, 15, 16],
  // 十堰特别API（2个全部可播放）✅
  shiyan: [1, 3],
  // 荆门特别API（2个全部可播放）✅
  jingmen: [4, 7], // 新闻综合、科教文旅
  // 长江云代理（6个全部可播放）✅
  proxy: ['jlzh', 'xyzh', 'xysh', 'xygg', 'wxzh', 'ltzh'],
  // 长阳（可用）✅
  changyang: true,
};

// 获取远程数据（带超时和错误处理）
async function fetchData(url: string, headers: Record<string, string> = {}): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...headers,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status} for ${url}`);
      return '';
    }
    
    return await response.text();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error(`Request timeout for ${url}`);
      } else {
        console.error(`Fetch error for ${url}:`, error.message);
      }
    }
    return '';
  }
}

// 长江云统一处理(通过site_id动态获取)
async function handleCjyunBySiteId(siteId: string, id: string) {
  const headers = { 'Referer': 'http://app.cjyun.org/' };
  const url = `https://app.cjyun.org/video/player/streamlist?site_id=${siteId}&live_type=1`;
  const json = await fetchData(url, headers);
  
  try {
    const data = JSON.parse(json);
    if (!data.data) return null;
    
    for (const item of data.data) {
      if (item.id == id) {
        const playUrl = item.play_url || item.url;
        return playUrl ? { redirect: playUrl } : null;
      }
    }
  } catch (error) {
    console.error('Parse error:', error);
  }
  
  return null;
}

// 解析全局唯一ID (格式: siteId_originalId)
function parseGlobalId(globalId: string): { siteId: string; originalId: string } | null {
  const parts = globalId.split('_');
  if (parts.length === 2) {
    return { siteId: parts[0], originalId: parts[1] };
  }
  return null;
}

// 恩施广电（保留原有独立API）
async function handleEnshi(id: string) {
  const apiUrl = 'https://dszb.estv.com.cn/chat/list?id=22';
  const response = await fetchData(apiUrl);
  
  try {
    const data = JSON.parse(response);
    if (!data.video || !Array.isArray(data.video)) return null;
    
    for (const video of data.video) {
      if (video.id == id) {
        return { redirect: video.url };
      }
    }
  } catch (error) {
    console.error('Parse error:', error);
  }
  
  return null;
}

// 长江云地市台
async function handleCjyunLocal(id: string, req: NextRequest) {
  const channels: Record<string, [string, string]> = {
    'jlzh': ['https://jiangling-live21.cjyun.org/10090/', 's10090-jltv01.m3u8?auth_key=1767196799-ced13be0a8ae11efa7dfa7dfd677b8f3-0-5ded7dc8f71b09f82e1efdd4bef9c173'],
    'xyzh': ['https://xiangyang-live21.cjyun.org/10125/', 's10125-news_hd.m3u8?auth_key=1767196799-ced13be0a8ae11efa7dfa7dfd677b8f3-0-dc97c38176b5aac42ac95d80d410eaf2'],
    'xysh': ['https://xiangyang-live21.cjyun.org/10125/', 's10125-society_hd.m3u8?auth_key=1767196799-ced13be0a8ae11efa7dfa7dfd677b8f3-0-f938b2a5f3375b9a43f5fa2ee62d484f'],
    'xygg': ['https://xiangyang-live21.cjyun.org/10125/', 's10125-education_hd.m3u8?auth_key=1767196799-ced13be0a8ae11efa7dfa7dfd677b8f3-0-58b7c654574766341cdd7ea5f4c8bc39'],
    'wxzh': ['https://wuxue-live21.cjyun.org/10107/', 's10107-wxtv1.m3u8?auth_key=1767196799-ced13be0a8ae11efa7dfa7dfd677b8f3-0-5027944a3323aec0fb1293cb024a9555'],
    'ltzh': ['https://luotian-live21.cjyun.org/10013/', 's10013-LTZH.m3u8?auth_key=1767196799-ced13be0a8ae11efa7dfa7dfd677b8f3-0-25551ca5ae536deb2cd1eca067453f45'],
  };
  
  if (!channels[id]) return null;
  
  const [baseUrl, m3u8File] = channels[id];
  
  // 根据域名设置正确的Referer
  const cityMatch = baseUrl.match(/https:\/\/([a-z]+)-live/);
  let referer = 'https://m.hbtv.com.cn/';
  
  if (cityMatch) {
    const cityName = cityMatch[1];
    if (!['jiangling', 'xiangyang'].includes(cityName)) {
      referer = `https://m.${cityName}.cjyun.org/`;
    }
  }
  
  // 获取M3U8内容
  const m3u8Content = await fetchData(baseUrl + m3u8File, { 'Referer': referer });
  
  if (!m3u8Content) return null;
  
  // 重写M3U8内容
  const host = getRealHost(req);
  const pathname = new URL(req.url).pathname;
  const lines = m3u8Content.split('\n');
  const newLines: string[] = [];
  
  for (let line of lines) {
    line = line.trim();
    
    if (!line) {
      newLines.push('');
      continue;
    }
    
    // 注释行直接保留
    if (line[0] === '#') {
      newLines.push(line);
      continue;
    }
    
    // TS文件替换为代理URL
    if (/\.ts(\?.*)?$/i.test(line)) {
      // 相对路径转绝对路径
      if (!line.startsWith('http')) {
        line = baseUrl + line;
      }
      newLines.push(`http://${host}${pathname}?ts=${encodeURIComponent(line)}`);
    } else {
      newLines.push(line);
    }
  }
  
  return {
    m3u8: newLines.join('\n'),
    contentType: 'application/vnd.apple.mpegurl',
  };
}

// 长阳广电
async function handleChangyang() {
  const html = await fetchData('https://m.ycchangyang.cn/zhibo');
  const match = html.match(/https?:\/\/[^'"]+\.m3u8\?[^'"]+/);
  
  if (match) {
    return { redirect: match[0] };
  }
  
  return null;
}

// 十堰广电
async function handleShiyan(id: string) {
  const url = `https://app2.syiptv.com/v3/tv/home?t=${Date.now()}`;
  const response = await fetchData(url);
  
  try {
    const data = JSON.parse(response);
    if (!data.data || !Array.isArray(data.data)) return null;
    
    for (const channel of data.data) {
      if (channel.tvChannelID == id) {
        return { redirect: channel.liveStreamingM3U8 };
      }
    }
  } catch (error) {
    console.error('Parse error:', error);
  }
  
  return null;
}

// 荆门广电
async function handleJingmen(id: string) {
  const url = 'https://mapi.jmtv.com.cn/api/v1/channel.php?&is_audio=0';
  const response = await fetchData(url);
  
  try {
    const data = JSON.parse(response);
    if (!Array.isArray(data)) return null;
    
    for (const channel of data) {
      if (channel.id == id) {
        return { redirect: channel.m3u8 };
      }
    }
  } catch (error) {
    console.error('Parse error:', error);
  }
  
  return null;
}

// 生成播放列表
async function generatePlaylist(req: NextRequest, showAll: boolean = false) {
  const host = getRealHost(req);
  const pathname = new URL(req.url).pathname;
  
  let m3u = '#EXTM3U\n';
  
  // 并行请求所有长江云地区的API（43个）
  const siteIds = Object.keys(CJYUN_SITES);
  const cjyunPromises = siteIds.map(siteId => 
    fetchData(`https://app.cjyun.org/video/player/streamlist?site_id=${siteId}&live_type=1`, { 'Referer': 'http://app.cjyun.org/' })
  );
  
  // 同时请求恩施、十堰、荆门的独立API
  const [enshiData, shiyanData, jingmenData, ...cjyunDataList] = await Promise.all([
    fetchData('https://dszb.estv.com.cn/chat/list?id=22'),
    fetchData(`https://app2.syiptv.com/v3/tv/home?t=${Date.now()}`),
    fetchData('https://mapi.jmtv.com.cn/api/v1/channel.php?&is_audio=0'),
    ...cjyunPromises,
  ]);
  
  // 处理长江云各地区频道
  for (let i = 0; i < siteIds.length; i++) {
    const siteId = siteIds[i];
    const cityName = CJYUN_SITES[siteId];
    const response = cjyunDataList[i];
    
    if (!response) continue;
    
    try {
      const data = JSON.parse(response);
      if (data.data && data.data.length > 0) {
        const availableIds = showAll ? null : AVAILABLE_CHANNELS.cjyun[siteId as keyof typeof AVAILABLE_CHANNELS.cjyun];
        const filteredChannels = showAll 
          ? data.data 
          : data.data.filter((item: any) => availableIds && availableIds.includes(Number(item.id)));
        
        if (filteredChannels.length === 0) continue;
        
        for (const item of filteredChannels) {
          let name = item.name;
          if (!name.includes(cityName)) {
            name = cityName + name;
          }
          const globalId = `${siteId}_${item.id}`;
          m3u += `#EXTINF:-1 group-title="${cityName}",${name}\n`;
          m3u += `http://${host}${pathname}?id=${globalId}\n`;
        }
      }
    } catch (error) {
      console.error(`Parse error for ${cityName}:`, error);
    }
  }
  
  // 恩施广电（独立API，包含广播频道）
  try {
    const data = JSON.parse(enshiData);
    if (data.video) {
      const availableIds = showAll ? null : AVAILABLE_CHANNELS.enshi;
      const filteredChannels = showAll 
        ? data.video 
        : data.video.filter((video: any) => availableIds && availableIds.includes(Number(video.id)));
      
      if (filteredChannels.length > 0) {
        for (const video of filteredChannels) {
          const icon = video.name.includes('FM') ? '📻' : '📺';
          m3u += `#EXTINF:-1 group-title="恩施",${icon} ${video.name}\n`;
          m3u += `http://${host}${pathname}?id=enshi_${video.id}\n`;
        }
      }
    }
  } catch (error) {
    console.error('Parse error for Enshi:', error);
  }
  
  // 长江云地市台（代理模式）✅
  const cjyunLocal: Record<string, string> = {
    'jlzh': '江陵综合',
    'xyzh': '襄阳综合',
    'xysh': '襄阳经济生活',
    'xygg': '襄阳公共',
    'wxzh': '武穴综合',
    'ltzh': '罗田综合',
  };
  
  if (showAll || AVAILABLE_CHANNELS.proxy) {
    for (const [id, name] of Object.entries(cjyunLocal)) {
      const cityName = name.replace(/综合|经济生活|公共/, '');
      m3u += `#EXTINF:-1 group-title="${cityName}",${name}\n`;
      m3u += `http://${host}${pathname}?id=${id}\n`;
    }
  }
  
  // 长阳广电（网页提取）
  m3u += '#EXTINF:-1 group-title="长阳",长阳综合\n';
  m3u += `http://${host}${pathname}?id=cyzh\n`;
  
  // 十堰广电（独立API）
  try {
    const data = JSON.parse(shiyanData);
    if (data.data) {
      const availableIds = showAll ? null : AVAILABLE_CHANNELS.shiyan;
      const filteredChannels = showAll 
        ? data.data 
        : data.data.filter((channel: any) => availableIds && availableIds.includes(Number(channel.tvChannelID)));
      
      if (filteredChannels.length > 0) {
        for (const channel of filteredChannels) {
          const id = 'sy' + channel.tvChannelID;
          let name = channel.channelName;
          if (!name.includes('十堰')) {
            name = '十堰' + name;
          }
          m3u += `#EXTINF:-1 group-title="十堰",${name}\n`;
          m3u += `http://${host}${pathname}?id=${id}\n`;
        }
      }
    }
  } catch (error) {
    console.error('Parse error for Shiyan:', error);
  }
  
  // 荆门广电（独立API）✅
  try {
    const data = JSON.parse(jingmenData);
    if (Array.isArray(data)) {
      const availableIds = showAll ? null : AVAILABLE_CHANNELS.jingmen;
      const filteredChannels = showAll 
        ? data 
        : data.filter((channel: any) => availableIds && availableIds.includes(Number(channel.id)));
      
      if (filteredChannels.length > 0) {
        for (const channel of filteredChannels) {
          const id = 'jm' + channel.id;
          let name = channel.name;
          if (!name.includes('荆门')) {
            name = '荆门' + name;
          }
          m3u += `#EXTINF:-1 group-title="荆门",${name}\n`;
          m3u += `http://${host}${pathname}?id=${id}\n`;
        }
      }
    }
  } catch (error) {
    console.error('Parse error for Jingmen:', error);
  }
  
  return m3u;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const ts = searchParams.get('ts');
  
  // 处理TS文件代理
  if (ts) {
    // 根据TS URL的域名设置正确的Referer
    const cityMatch = ts.match(/https:\/\/([a-z]+)-live/);
    let referer = 'https://m.hbtv.com.cn/';
    
    if (cityMatch) {
      const cityName = cityMatch[1];
      if (!['jiangling', 'xiangyang'].includes(cityName)) {
        referer = `https://m.${cityName}.cjyun.org/`;
      }
    }
    
    try {
      const response = await fetch(ts, {
        headers: {
          'Referer': referer,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      
      if (!response.ok) {
        return new NextResponse('TS fetch failed', { status: 502 });
      }
      
      const tsData = await response.arrayBuffer();
      return new NextResponse(tsData, {
        headers: {
          'Content-Type': 'video/mp2t',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (error) {
      console.error('TS fetch error:', error);
      return new NextResponse('TS fetch failed', { status: 502 });
    }
  }
  
  if (!id) {
    return new NextResponse('Missing id parameter', { status: 400 });
  }
  
  // 生成播放列表
  if (id === 'list') {
    const showAll = searchParams.get('all') === '1'; // 支持 all=1 显示所有频道
    
    // 检查缓存是否有效
    const now = Date.now();
    const forceRefresh = searchParams.get('refresh') === '1'; // 支持强制刷新
    const cache = showAll ? playlistCacheAll : playlistCache;
    
    if (!forceRefresh && cache && (now - cache.timestamp < PLAYLIST_CACHE_TTL * 1000)) {
      // 缓存有效，直接返回
      console.log(`Returning cached playlist (showAll=${showAll})`);
      return new NextResponse(cache.data, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl; charset=UTF-8',
          'Cache-Control': `public, max-age=${PLAYLIST_CACHE_TTL}`,
          'X-Cache': 'HIT',
          'X-Cache-Time': new Date(cache.timestamp).toISOString(),
          'X-Playlist-Type': showAll ? 'all' : 'available',
        },
      });
    }
    
    // 缓存失效或强制刷新，重新生成
    console.log(forceRefresh ? `Force refresh playlist (showAll=${showAll})` : `Generating new playlist (showAll=${showAll})`);
    const playlist = await generatePlaylist(req, showAll);
    
    // 更新缓存
    if (showAll) {
      playlistCacheAll = {
        data: playlist,
        timestamp: now,
      };
    } else {
      playlistCache = {
        data: playlist,
        timestamp: now,
      };
    }
    
    return new NextResponse(playlist, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl; charset=UTF-8',
        'Cache-Control': `public, max-age=${PLAYLIST_CACHE_TTL}`,
        'X-Cache': 'MISS',
        'X-Cache-Time': new Date(now).toISOString(),
        'X-Playlist-Type': showAll ? 'all' : 'available',
      },
    });
  }
  
  let result = null;
  
  // 优先检查特殊API（避免被 parseGlobalId 误判）
  // 恩施广电(独立API,ID前缀enshi_)
  if (id.startsWith('enshi_')) {
    const enshiId = id.replace('enshi_', '');
    result = await handleEnshi(enshiId);
  }
  // 十堰广电 (sy1, sy3)
  else if (id.startsWith('sy')) {
    const syId = id.replace('sy', '');
    result = await handleShiyan(syId);
  }
  // 荆门广电 (jm4, jm6, jm7)
  else if (id.startsWith('jm')) {
    const jmId = id.replace('jm', '');
    result = await handleJingmen(jmId);
  }
  // 长江云地市台 (字符串ID)
  else if (['jlzh', 'xyzh', 'xysh', 'xygg', 'wxzh', 'ltzh'].includes(id)) {
    result = await handleCjyunLocal(id, req);
  }
  // 长阳广电
  else if (id === 'cyzh') {
    result = await handleChangyang();
  }
  // 长江云频道(使用全局唯一ID格式: siteId_originalId)
  else {
    const parsed = parseGlobalId(id);
    if (parsed) {
      // 新格式: siteId_originalId (如: 10094_40)
      result = await handleCjyunBySiteId(parsed.siteId, parsed.originalId);
    } else if (/^\d+$/.test(id)) {
      // 兼容旧格式: 纯数字ID (遍历所有site_id查找)
      // 注意: 这可能导致ID冲突,建议迁移到新格式
      for (const [siteId, cityName] of Object.entries(CJYUN_SITES)) {
        result = await handleCjyunBySiteId(siteId, id);
        if (result) break;
      }
    }
  }
  
  if (!result) {
    return new NextResponse('Channel not found', { status: 404 });
  }
  
  // 处理302跳转
  if ('redirect' in result) {
    return NextResponse.redirect(result.redirect);
  }
  
  // 处理M3U8代理
  if ('m3u8' in result) {
    return new NextResponse(result.m3u8, {
      headers: {
        'Content-Type': result.contentType || 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache',
      },
    });
  }
  
  return new NextResponse('Unknown error', { status: 500 });
}
