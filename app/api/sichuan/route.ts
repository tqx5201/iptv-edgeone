import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';

//export const runtime = 'edge';

// 频道配置
const CHANNELS: Record<string, string> = {
	scws: 'sctv1', // 四川卫视
	scws4k: '2345_4k', // 四川卫视4K
	scjj: 'sctv2', // 四川经济
	scwhly: 'sctv3', // 四川文化旅游
	scxw: 'sctv4', // 四川新闻
	scyswy: 'sctv5', // 四川影视文艺
	scxkgw: 'sctv6', // 四川星空购物
	scfnet: 'sctv7', // 四川妇女儿童
	scxc: 'sctv9', // 四川乡村
	kbws: 'kangba', // 康巴卫视
};

// 全局authkey缓存（Edge全局变量）
const globalAny = globalThis as any;
if (!globalAny.sctvAuthCache) globalAny.sctvAuthCache = new Map();
const authCache: Map<string, { time: number; auth: string }> = globalAny.sctvAuthCache;
const CACHE_EXPIRE = 3600;



function getProtocol(req: NextRequest) {
	return req.headers.get('x-forwarded-proto') || 'https';
}

function buildSelfUrl(req: NextRequest, path: string) {
	return `${getProtocol(req)}://${getRealHost(req)}${path}`;
}

async function fetchWithHeaders(url: string, headers: Record<string, string>, opts: RequestInit = {}) {
	return fetch(url, {
		...opts,
		headers,
		redirect: 'follow',
		cache: 'no-store',
	});
}

// 获取authkey并缓存
async function getAuthKey(id: string, is4k: boolean): Promise<string> {
	const cacheKey = id;
	const now = Math.floor(Date.now() / 1000);
	const cached = authCache.get(cacheKey);
	if (cached && now - cached.time < CACHE_EXPIRE && cached.auth) {
		return cached.auth;
	}
	let streamName = is4k
		? '%2Flive%2F2345_4k265hdr1080.m3u8'
		: `%2Flive%2F${CHANNELS[id]}_264sctvhdr720.m3u8`;
	const url = `https://gw.scgchc.com/app/v1/anti/getLiveSecret?streamName=${streamName}&txTime=${now}`;
	const Auth =
		'bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiU0VSVklDRV9TQ0dDLURFTU8iXSwidXNlcl9pZCI6MTk4Mzc1NTkzODU2MDAxMjI5MCwic2NvcGUiOlsiYWxsIl0sImV4cCI6MTc2MzM3MDA4NywiYXV0aG9yaXRpZXMiOlsiUk9MRV9BUFBfQ0xJRU5UX1VTRVIiXSwianRpIjoiNDU3ZDc0YzUtMWNmNS00MDc5LTkwNzUtMmVmNjJlOThmYWQwIiwiY2xpZW50X2lkIjoiU0VSVklDRV9TQ0dDLUFQUCJ9.D92IxnFDVRHGQTgCGTlnQVuOUM6boXBXURlI07b8yOPcE38kKrfdE1FXP_bPstrFQQao77pQnwLkiwog3MVCBx3HFYCY1rNkocGfzxsQ9nhIUXxu1f7MBXq_czIOhl144xevQ2zub6HajNIp8Xw2zsxYg7SWx4dcF2W9coMCGqeHwQN-aqlhl5I4g3ygeSV-HHaTHmagRiQwnBHwMr9HYUBIJpir8PC4OtgsmEdp0ngskW4aZ7GemxTZzCA7vlaMJWzDwxnVKFl4raBwBMQZG0HIaf_HT58OKcJBO4adlfHmqf7V0jQ1P8s1Kp4brdCuyuauJ6hH5FmT8K0l-Q3d6w'; //手机号验证码登陆网站获取，https://gw.scgchc.com/app/v1/anti/getLiveSecret请求标头里
	const headers = {
		Authorization: Auth,
		Referer: 'https://www.sctv.com/',
	};
	const resp = await fetchWithHeaders(url, headers);
	const data = await resp.json();
	const auth = data?.data?.secret || '';
	if (auth) {
		authCache.set(cacheKey, { time: now, auth });
	}
	return auth;
}

export async function GET(request: NextRequest) {

		// 统一提前声明 searchParams, pathname, id
		const urlObj = new URL(request.url);
		const searchParams = urlObj.searchParams;
		const pathname = urlObj.pathname;
		const id = searchParams.get('id') || 'scws';

		// 频道中文名映射
		const CHANNEL_NAMES: Record<string, string> = {
			scws: '四川卫视',
			scws4k: '四川卫视4K',
			scjj: '四川经济',
			scwhly: '四川文化旅游',
			scxw: '四川新闻',
			scyswy: '四川影视文艺',
			scxkgw: '四川星空购物',
			scfnet: '四川妇女儿童',
			scxc: '四川乡村',
			kbws: '康巴卫视',
		};

		// ?id=list 返回所有频道m3u8代理列表
		if (id === 'list') {
			let m3u = '#EXTM3U\n';
			const selfUrl = buildSelfUrl(request, pathname);
			for (const [cid, cname] of Object.entries(CHANNELS)) {
				const zhName = CHANNEL_NAMES[cid] || cid;
				m3u += `#EXTINF:-1,${zhName}\n`;
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

	// 四川卫视4K专用分支
	if (id === 'scws4k') {
			// 1. m4s切片代理
			const m4s = searchParams.get('m4s');
			if (m4s) {
				let m4s_url = m4s;
				try {
					m4s_url = decodeURIComponent(m4s);
				} catch {}
				if (/^https?:\/\//.test(m4s_url)) {
					const headers = {
						Host: 'hmmslivef.scgczm.com',
						Origin: 'https://www.sctv.com',
						Referer: 'https://www.sctv.com/',
						'User-Agent': 'ExoSourceManager/3.2.0 (Linux;Android 13) ExoPlayerLib/2.12.1',
						'Cache-Control': 'no-cache',
						Pragma: 'no-cache',
						Accept: '*/*',
						'Accept-Encoding': 'gzip, deflate, br, zstd',
						'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
						'sec-ch-ua': '"Microsoft Edge";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
						'sec-ch-ua-mobile': '?0',
						'sec-ch-ua-platform': '"Windows"',
						'Sec-Fetch-Dest': 'empty',
						'Sec-Fetch-Mode': 'cors',
						'Sec-Fetch-Site': 'cross-site',
					};
					const resp = await fetchWithHeaders(m4s_url, headers);
					if (resp.status === 200) {
						const buf = await resp.arrayBuffer();
						return new NextResponse(buf, {
							status: 200,
							headers: { 'Content-Type': 'video/mp4', 'Cache-Control': 'public, max-age=60' },
						});
					} else {
						return new NextResponse('403 Forbidden', { status: 403 });
					}
				}
			}

				// 2. 二级m3u8代理
				const m3u8 = searchParams.get('m3u8');
				if (m3u8) {
					let m3u8_url = m3u8.startsWith('http')
						? m3u8
						: 'https://hmmslivef.scgczm.com/live/' + m3u8.replace(/^\//, '');
					const headers = {
						Host: 'hmmslivef.scgczm.com',
						Accept: '*/*',
						'Accept-Encoding': 'gzip, deflate, br, zstd',
						'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
						'Cache-Control': 'no-cache',
						Connection: 'keep-alive',
						Origin: 'https://www.sctv.com',
						Pragma: 'no-cache',
						Referer: 'https://www.sctv.com/',
						'Sec-Fetch-Dest': 'empty',
						'Sec-Fetch-Mode': 'cors',
						'Sec-Fetch-Site': 'cross-site',
						'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0',
						'sec-ch-ua': '"Microsoft Edge";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
						'sec-ch-ua-mobile': '?0',
						'sec-ch-ua-platform': '"Windows"',
					};
					const resp = await fetchWithHeaders(m3u8_url, headers);
					if (!resp.ok) {
						return new NextResponse('m3u8 fetch error', { status: 502 });
					}
					let data = await resp.text();
							// 替换m4s切片为本地代理（只对m4s参数做一次encodeURIComponent，外层URL保持明文）
							data = data.replace(/((?:https?:\/\/)?[0-9a-zA-Z_.\-\/]+\.(m4s)(?:\?[^\s\"]*)?)/gi, (m0) => {
								const url = m0.startsWith('http') ? m0 : 'https://hmmslivef.scgczm.com/live/' + m0.replace(/^\//, '');
								return buildSelfUrl(request, pathname) + `?id=scws4k&m4s=${encodeURIComponent(url)}`;
							});
							// 对EXT-X-MEDIA/EXT-X-STREAM-INF等URI参数做编码，最大兼容VLC/ffmpeg等播放器
							// 加 Content-Length，最大兼容 PotPlayer
									const encoder = new TextEncoder();
									const buf = encoder.encode(data);
									// 模拟 PHP/Apache 响应头，关闭 keep-alive，去除 chunked
									return new Response(buf, {
										status: 200,
										headers: {
											'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
											'Cache-Control': 'public, max-age=60',
											'Content-Length': buf.length.toString(),
											'Connection': 'close',
											'Server': 'Apache/2.4.65 (Debian)',
											'X-Powered-By': 'PHP/8.4.13',
											'Keep-Alive': 'timeout=4',
										},
									});
				}

		// 3. 主m3u8拉流及authkey缓存
		let auth = await getAuthKey('scws4k', true);
		let playurl = `https://hmmslivef.scgczm.com/live/2345_4k265hdr1080.m3u8?${auth}`;
		const headers = {
			Host: 'hmmslivef.scgczm.com',
			Origin: 'https://www.sctv.com',
			Referer: 'https://www.sctv.com/',
			'User-Agent': 'ExoSourceManager/3.2.0 (Linux;Android 13) ExoPlayerLib/2.12.1',
			'Cache-Control': 'no-cache',
			Pragma: 'no-cache',
			Accept: '*/*',
			'Accept-Encoding': 'gzip, deflate, br, zstd',
			'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
			'sec-ch-ua': '"Microsoft Edge";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"Windows"',
			'Sec-Fetch-Dest': 'empty',
			'Sec-Fetch-Mode': 'cors',
			'Sec-Fetch-Site': 'cross-site',
		};
		let retry = 0;
		let data = '';
				while (retry < 2) {
					const resp = await fetchWithHeaders(playurl, headers);
					data = await resp.text();
					if (data.includes('#EXTM3U')) {
						// 替换二级m3u8为本地代理（参数为明文URL）
												// 只对m3u8参数做一次encodeURIComponent，外层URI保持明文
												data = data.replace(/([0-9a-zA-Z_\-]+\-video\.m3u8(?:\?[^\s\"]+)?|[0-9a-zA-Z_\-]+\-audio\.m3u8(?:\?[^\s\"]+)?)/gi, (m0) => {
													const absurl = 'https://hmmslivef.scgczm.com/live/' + m0;
													return buildSelfUrl(request, pathname) + `?id=scws4k&m3u8=${encodeURIComponent(absurl)}`;
												});
												// EXT-X-MEDIA/EXT-X-STREAM-INF等URI参数保持明文，不再二次编码
												// 保证与之前能播放时一致
						// 加 Content-Length，最大兼容 PotPlayer
						const encoder = new TextEncoder();
						const buf = encoder.encode(data);
						// 模拟 PHP/Apache 响应头，关闭 keep-alive，去除 chunked
						return new Response(buf, {
							status: 200,
							headers: {
								'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
								'Cache-Control': 'public, max-age=60',
								'Content-Length': buf.length.toString(),
								'Connection': 'close',
								'Server': 'Apache/2.4.65 (Debian)',
								'X-Powered-By': 'PHP/8.4.13',
								'Keep-Alive': 'timeout=4',
							},
						});
					} else if (retry === 0) {
						// 403时强制刷新authkey
						authCache.delete('scws4k');
						auth = await getAuthKey('scws4k', true);
						playurl = `https://hmmslivef.scgczm.com/live/2345_4k265hdr1080.m3u8?${auth}`;
						retry++;
					} else {
						return new NextResponse('403 Forbidden', { status: 403 });
					}
				}
		return new NextResponse('403 Forbidden', { status: 403 });
	}

	// ts切片代理分支（必须最前）
	const ts = searchParams.get('ts');
	if (ts && /^https?:\/\//.test(ts)) {
		const ts_headers = {
			Host: 'tvshow.scgczm.com',
			Origin: 'https://www.sctv.com',
			Referer: 'https://www.sctv.com/',
			'User-Agent': 'ExoSourceManager/3.2.0 (Linux;Android 13) ExoPlayerLib/2.12.1',
			Accept: '*/*',
			'Accept-Encoding': 'identity',
			Connection: 'close',
		};
		const resp = await fetchWithHeaders(ts, ts_headers);
		if (resp.status === 200) {
			const buf = await resp.arrayBuffer();
			return new NextResponse(buf, {
				status: 200,
				headers: { 'Content-Type': 'video/mp2t' },
			});
		} else {
			return new NextResponse(`ts代理失败 code=${resp.status}`, { status: 502 });
		}
	}

	// 主m3u8代理分支
	if (!CHANNELS[id]) {
		return new NextResponse('频道 id 不存在', {
			status: 404,
			headers: { 'Content-Type': 'text/plain; charset=utf-8' },
		});
	}

	// 普通频道authkey缓存
	let auth = await getAuthKey(id, false);
	let playurl = `https://tvshow.scgczm.com/live/${CHANNELS[id]}_264sctvhdr720.m3u8?${auth}`;
	const referer = 'https://www.sctv.com/';
	const r = {
		Host: 'tvshow.scgczm.com',
		Origin: 'https://www.sctv.com',
		Referer: referer,
		'User-Agent': 'ExoSourceManager/3.2.0 (Linux;Android 13) ExoPlayerLib/2.12.1',
		'Cache-Control': 'no-cache',
		Pragma: 'no-cache',
		Accept: '*/*',
		'Accept-Encoding': 'gzip, deflate, br, zstd',
		'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
		'sec-ch-ua': '"Microsoft Edge";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
		'sec-ch-ua-mobile': '?0',
		'sec-ch-ua-platform': '"Windows"',
		'Sec-Fetch-Dest': 'empty',
		'Sec-Fetch-Mode': 'cors',
		'Sec-Fetch-Site': 'cross-site',
	};
	let retry = 0;
	let streamData = '';
	while (retry < 2) {
		const resp = await fetchWithHeaders(playurl, r);
		streamData = await resp.text();
		if (resp.status === 403 && retry === 0) {
			// 删除缓存，强制重新获取authkey
			authCache.delete(id);
			auth = await getAuthKey(id, false);
			playurl = `https://tvshow.scgczm.com/live/${CHANNELS[id]}_264sctvhdr720.m3u8?${auth}`;
			retry++;
		} else {
			break;
		}
	}
		if (streamData && streamData.length > 0) {
			// 替换 ts 路径为本地代理（参数为明文URL，不编码）
			streamData = streamData.replace(/([a-zA-Z0-9_.-]+\.ts\?auth_key=[^\s\"]+)/gi, (m0) => {
				let ts = m0;
				if (!ts.startsWith('tvshow.scgczm.com_')) {
					ts = 'tvshow.scgczm.com_' + ts;
				}
				const url = 'https://tvshow.scgczm.com/live/' + ts;
				return buildSelfUrl(request, pathname) + `?ts=${url}`;
			});
			return new NextResponse(streamData, {
				status: 200,
				headers: { 'Content-Type': 'application/vnd.apple.mpegurl' },
			});
		}
	return new NextResponse('m3u8 fetch error', { status: 502 });
}
