import {
  defineEventHandler,
  getQuery,
  createError,
  setResponseHeader,
  setResponseStatus,
  send,
} from 'h3';

// 仅允许转发微信域名，避免成为开放代理
const ALLOWED_HOST_RE = /(^|\.)weixin\.qq\.com$/;

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const rawUrl = query.url;
  const headersRaw = query.headers;

  if (typeof rawUrl !== 'string' || !rawUrl) {
    throw createError({ statusCode: 400, statusMessage: 'missing url' });
  }

  let target: URL;
  try {
    target = new URL(decodeURIComponent(rawUrl));
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'invalid url' });
  }

  if (!ALLOWED_HOST_RE.test(target.hostname)) {
    throw createError({ statusCode: 403, statusMessage: 'forbidden host' });
  }

  // 解析并透传调用方传入的请求头（含微信登录态 cookie 等）
  const headers: Record<string, string> = {};
  if (typeof headersRaw === 'string' && headersRaw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(headersRaw));
      if (parsed && typeof parsed === 'object') {
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'string') headers[k] = v;
        }
      }
    } catch {
      // 忽略非法 headers
    }
  }
  // 移除逐跳头，避免冲突
  delete headers['host'];
  delete headers['content-length'];
  delete headers['transfer-encoding'];
  delete headers['connection'];

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      method: 'GET',
      headers,
      redirect: 'follow',
    });
  } catch (e) {
    throw createError({ statusCode: 502, statusMessage: 'bad gateway: ' + (e as Error).message });
  }

  const buf = Buffer.from(await upstream.arrayBuffer());
  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';

  setResponseStatus(event, upstream.status);
  setResponseHeader(event, 'content-type', contentType);
  setResponseHeader(event, 'cache-control', 'no-store');
  return send(event, buf);
});
