import { NextRequest, NextResponse } from 'next/server';

//export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const headers: Record<string, string> = {};
  
  // 收集所有 headers
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  
  // 获取 URL 信息
  const url = new URL(request.url);
  
  const debugInfo = {
    url: request.url,
    host: url.host,
    protocol: url.protocol,
    pathname: url.pathname,
    headers: headers,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PUBLIC_DOMAIN: process.env.PUBLIC_DOMAIN,
    }
  };
  
  return NextResponse.json(debugInfo, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}
