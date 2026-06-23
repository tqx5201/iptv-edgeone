import { NextRequest, NextResponse } from 'next/server';
import { getRealHost } from '../utils/url';
import { aesEcbDecrypt, hexToBytes } from '../utils/crypto';

//export const runtime = 'edge';

// 频道配置：[m3u8_url, aes_key_hex, blocks]
const CHANNELS: Record<number, [string, string, number, string]> = {
  1: ['https://hlscdn.liangtv.cn/live/0c4ef3a44b934cacb8b47121dfada66c/d7e04258157b480dae53883cc6f8123b-1.m3u8', 'aa390855e94889d26ccf2c5a0c342e73', 18, '广西卫视'],
  2: ['https://hlscdn.liangtv.cn/live/de0f97348eb84f62aa6b7d8cf0430770/dd505d87880c478f901f38560ca4d4e6-1.m3u8', '59ccd582591a61e35a2434df51d8e697', 26, '综艺旅游频道'],
  3: ['https://hlscdn.liangtv.cn/live/b8f4e500a4024fd2bf189b46f490359f/b04d249044fb4d0887b88aa9c2cc8f6c-1.m3u8', '3d4a0a74ee9af217ff63c7bf7bfa4f91', 17, '都市频道'],
  4: ['https://hlscdn.liangtv.cn/live/a84182dabc5147afbd3d90ddbb5a9404/d097f6c24c53463e897de496b32c7d2b-1.m3u8', '328d87240d5c25c1f412a08be81a1649', 4, '影视频道'],
  5: ['https://hlscdn.liangtv.cn/live/a48635e37ac84afa82c0d0edc4bfabf9/dbc9a18971294257bad7c75b7f3f0c20-1.m3u8', 'c21df4dd9cbd339b20b6e435a62f10e3', 4, '新闻频道'],
  6: ['https://hlscdn.liangtv.cn/live/0234c48e0bc24fe1b41b9999a253e581/1075ee38e04f490690f6a36a16e09c79-1.m3u8', '4297eb2b6d538f7bee595e70b35289fb', 24, '国际频道'],
  7: ['https://hlscdn.liangtv.cn/live/2cb851292fd14014a6558343872899e6/0820054f3fcc4ee5b4d17198bd7eddd6-1.m3u8', '1ec32c4e7960167d4d9679d2ef5f7265', 16, '乐思购频道'],
  8: ['https://hlscdn.liangtv.cn/live/b6cea70bfad24970aaa2256a3c340ad4/0a79a8e5f94641e583d1872ef7bed2bf-1.m3u8', '5c1d834a84f3ff24720622105b5cddfe', 9, '移动数字电视频道'],
  9: ['https://hlscdn.liangtv.cn/live/ddb2ee1aa1134ac591230352a121aa22/bc359bd2e13b4cb9a3096effa77d1bc0-1.m3u8', 'b324a5b0682ea911d1ccc18ebc1c0cba', 11, 'CETV-1'],
  10: ['https://hlscdn.liangtv.cn/live/3f29b81206fe4d229e1522d59aae8e75/15a4a13dbf624ab9ac7cca5df100e985-1.m3u8', '7a63f3adc0ebbf30eab427a9846cf8be', 7, 'CETV-2'],
  11: ['https://hlscdn.liangtv.cn/live/63f3fd7d8cf44a3e9719eec310c86fa5/b96f8fd6d5424ad4862d054172f616e4-1.m3u8', '86556718d2add26ff9136a1af241b3db', 11, 'CETV-4'],
};

// 解析PAT表
function parsePAT(data: Uint8Array, offset: number): number {
  return ((data[offset + 10] & 0x1f) << 8) | data[offset + 11];
}

// 解析PMT表
function parsePMT(data: Uint8Array, offset: number): { audio: number; avc: number; id3: number } {
  const result = { audio: -1, avc: -1, id3: -1 };
  const sectionLength = ((data[offset + 1] & 0x0f) << 8) | data[offset + 2];
  const programInfoLength = ((data[offset + 10] & 0x0f) << 8) | data[offset + 11];
  
  let pos = offset + 12 + programInfoLength;
  const endPos = offset + 3 + sectionLength - 4;

  while (pos < endPos) {
    const streamType = data[pos];
    const pid = ((data[pos + 1] & 0x1f) << 8) | data[pos + 2];
    const esInfoLength = ((data[pos + 3] & 0x0f) << 8) | data[pos + 4];

    switch (streamType) {
      case 15: // AAC Audio
        if (result.audio === -1) result.audio = pid;
        break;
      case 21: // ID3
        if (result.id3 === -1) result.id3 = pid;
        break;
      case 27: // H.264 Video
        if (result.avc === -1) result.avc = pid;
        break;
    }

    pos += 5 + esInfoLength;
  }

  return result;
}

// 解析并解密TS流
function decryptTS(data: Uint8Array, key: Uint8Array, blocks: number): Uint8Array {
  const result = new Uint8Array(data);
  let pmtPid = -1;
  let videoPid = -1;
  let audioPid = -1;
  let id3Pid = -1;

  const pesBuffers: Map<number, { data: Uint8Array[]; offsets: number[] }> = new Map();

  // 解析TS包
  const packetCount = Math.floor(data.length / 188);
  for (let i = 0; i < packetCount; i++) {
    const offset = i * 188;
    
    if (data[offset] !== 0x47) continue; // 同步字节

    const payloadStart = !!(data[offset + 1] & 0x40);
    const pid = ((data[offset + 1] & 0x1f) << 8) | data[offset + 2];
    const adaptationField = (data[offset + 3] & 0x30) >> 4;

    let payloadOffset = offset + 4;
    if (adaptationField > 1) {
      payloadOffset += data[offset + 4] + 1;
      if (payloadOffset >= offset + 188) continue;
    }

    // PAT
    if (pid === 0 && payloadStart) {
      pmtPid = parsePAT(data, payloadOffset + data[payloadOffset] + 1);
    }
    // PMT
    else if (pid === pmtPid && payloadStart) {
      const pmt = parsePMT(data, payloadOffset + data[payloadOffset] + 1);
      videoPid = pmt.avc;
      audioPid = pmt.audio;
      id3Pid = pmt.id3;
    }
    // PES数据
    else if (pid === videoPid || pid === audioPid || pid === id3Pid) {
      if (payloadStart) {
        // 处理之前的PES
        const buffer = pesBuffers.get(pid);
        if (buffer && buffer.data.length > 0) {
          processPES(buffer, result, key, blocks);  // 现在是同步函数
        }
        // 开始新的PES
        pesBuffers.set(pid, { data: [], offsets: [] });
      }

      const buffer = pesBuffers.get(pid);
      if (buffer) {
        const payloadData = data.slice(payloadOffset, offset + 188);
        buffer.data.push(payloadData);
        buffer.offsets.push(payloadOffset);
      }
    }
  }

  // 处理剩余的PES
  for (const buffer of pesBuffers.values()) {
    if (buffer.data.length > 0) {
      processPES(buffer, result, key, blocks);  // 现在是同步函数
    }
  }

  return result;
}

// 处理单个PES包
function processPES(
  buffer: { data: Uint8Array[]; offsets: number[] },
  result: Uint8Array,
  key: Uint8Array,
  blocks: number
): void {
  // 合并数据并计算header长度（PHP逻辑：先merge检查header，再在loop中skip）
  let totalSize = 0;
  for (const chunk of buffer.data) {
    totalSize += chunk.length;
  }

  const pesData = new Uint8Array(totalSize);
  let pos = 0;
  for (const chunk of buffer.data) {
    pesData.set(chunk, pos);
    pos += chunk.length;
  }

  if (pesData.length < 19) return;

  // 检查PES起始码
  if (pesData[0] !== 0 || pesData[1] !== 0 || pesData[2] !== 1) return;

  const flags = pesData[7];
  const headerLength = pesData[8];
  const payloadStart = 9 + headerLength;

  if (payloadStart >= pesData.length) return;

  // 检查是否需要解密（标志位1）
  if (!(flags & 0x01)) return;

  // 提取payload（已跳过header）
  const payload = pesData.slice(payloadStart);
  
  // 解密（先AES解密，稍后统一交换块）
  const blockSize = Math.floor(payload.length / blocks);
  const decrypted = decryptPayload(key, payload, blockSize, blocks);
  
  // 交换块（对应PHP的swapBlocks）
  swapBlocks(decrypted, blockSize, blocks);

  // 写回结果（PHP逻辑：$s[$O[$i]] = $e[$i]，其中$O已在loop中splice过）
  // 建立offset映射 - 模拟PHP在loop中逐步构建并splice的行为
  const offsetMap: number[] = [];
  let skipBytes = payloadStart;  // 需要跳过的header字节数
  
  for (let i = 0; i < buffer.offsets.length; i++) {
    const chunkLen = buffer.data[i].length;
    const baseOffset = buffer.offsets[i];
    
    if (skipBytes > 0) {
      if (skipBytes >= chunkLen) {
        // 整个chunk跳过（PHP: array_splice($O, 0, $t2); continue;）
        skipBytes -= chunkLen;
        continue;
      }
      // 部分跳过（PHP: $r = substr($r, $u); array_splice($O, 0, $u);）
      for (let j = skipBytes; j < chunkLen; j++) {
        offsetMap.push(baseOffset + j);
      }
      skipBytes = 0;
    } else {
      // 全部加入
      for (let j = 0; j < chunkLen; j++) {
        offsetMap.push(baseOffset + j);
      }
    }
  }
  
  // 写回（PHP: for ($i = 0; $i < count($o); $i++) $s[$o[$i]] = $e[$i];）
  for (let i = 0; i < decrypted.length && i < offsetMap.length; i++) {
    result[offsetMap[i]] = decrypted[i];
  }
}

// 解密payload（对应PHP的decryptV2函数）
function decryptPayload(key: Uint8Array, data: Uint8Array, blockSize: number, blocks: number): Uint8Array {
  const result = new Uint8Array(data);

  // AES解密中间部分（从halfBlock开始，每16字节一个AES块）
  const halfBlock = Math.floor(blockSize / 2);
  const encryptedSize = data.length - halfBlock - 1;
  const blockCount = Math.floor(encryptedSize / 16);

  for (let i = 0; i < blockCount; i++) {
    const offset = halfBlock + i * 16;
    const block = data.slice(offset, offset + 16);
    const decrypted = aesEcbDecrypt(block, key);
    result.set(decrypted, offset);
  }

  // 注意：不在这里交换块！交换在processPES之后统一进行
  return result;
}

// 块交换
function swapBlocks(data: Uint8Array, blockSize: number, blocks: number): void {
  if (blocks < 2) return;

  // PHP逻辑：先提取副本，再写入，避免覆盖问题
  // 提取最后一个块
  const lastBlock = data.slice((blocks - 1) * blockSize, blocks * blockSize);
  
  // 提取中间块（block1 到 block(n-2)）
  const middleStart = blockSize;
  const middleEnd = (blocks - 1) * blockSize;
  const middleBlocks = data.slice(middleStart, middleEnd);
  
  // 放入中间块到新位置（从block2开始）
  data.set(middleBlocks, 2 * blockSize);
  
  // 放入最后一个块到block1位置
  data.set(lastBlock, blockSize);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ts = searchParams.get('ts');

    // 频道列表
    if (id === 'list') {
      const host = getRealHost(request);
      const protocol = request.url.startsWith('https') ? 'https' : 'http';
      const baseUrl = `${protocol}://${host}/api/guangxi`;
      
      let m3u8 = '#EXTM3U\n';
      for (const [channelId, [, , , name]] of Object.entries(CHANNELS)) {
        m3u8 += `#EXTINF:-1,${name}\n`;
        m3u8 += `${baseUrl}?id=${channelId}\n`;
      }

      return new NextResponse(m3u8, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const channelId = parseInt(id || '1');
    if (!CHANNELS[channelId]) {
      return new NextResponse('Invalid channel ID', { status: 400 });
    }

    const [m3u8Url, keyHex, blocks] = CHANNELS[channelId];
    const key = hexToBytes(keyHex);

    // TS文件代理（完整解密 - 使用aes-js，性能比crypto-js快7.5倍）
    if (ts) {
      // 构造TS URL：origin + dirname(pathname) + / + ts文件名
      const m3u8UrlObj = new URL(m3u8Url);
      const dirname = m3u8UrlObj.pathname.split('/').slice(0, -1).join('/');
      const tsUrl = `${m3u8UrlObj.origin}${dirname}/${ts}`;
      
      // 获取原始TS文件
      const tsResponse = await fetch(tsUrl);
      if (!tsResponse.ok) {
        console.error('TS fetch failed:', tsUrl, 'status:', tsResponse.status);
        return new NextResponse('TS fetch failed', { status: 502 });
      }

      const tsData = new Uint8Array(await tsResponse.arrayBuffer());
      
      // 解密TS流（使用aes-js，约3秒/1.7MB）
      const decrypted = decryptTS(tsData, key, blocks);

      return new NextResponse(decrypted.buffer as ArrayBuffer, {
        headers: {
          'Content-Type': 'video/mp2t',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // M3U8代理
    const m3u8Response = await fetch(m3u8Url);
    if (!m3u8Response.ok) {
      return new NextResponse('M3U8 fetch failed', { status: 502 });
    }

    let m3u8Content = await m3u8Response.text();
    
    // 替换TS URL
    const host = getRealHost(request);
    const protocol = request.url.startsWith('https') ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}/api/guangxi`;
    m3u8Content = m3u8Content.replace(/^(?=[^#])/gm, `${baseUrl}?id=${channelId}&ts=`);

    return new NextResponse(m3u8Content, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Guangxi API error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return new NextResponse(`Internal Server Error: ${error}`, { status: 500 });
  }
}
