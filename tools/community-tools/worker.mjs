import { HOME, NOT_FOUND, UNAVAILABLE } from './pages.mjs';

const PUBLIC_ORIGIN = 'https://tool.cmi.community';
export const RELEASE = 'paths-v1-20261115';
// Each project owns a public prefix and an existing service binding.
export const PROJECTS = [{ prefix: '/shaodian/', binding: 'SHAODIAN' }];
const LEGACY_ASSETS = new Set([
  '/app.js', '/board.js', '/account.js', '/components.js', '/route.js', '/flight.js',
  '/style.css', '/components.css', '/brand/cmi-community-logo.png',
]);
const LEGACY_SCRIPT = "if(['#board','#composer','#mine'].includes(location.hash)){location.replace('/shaodian/'+location.search+location.hash)};";

function response(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: { 'cache-control': 'no-store', 'x-cmi-tools-version': RELEASE, ...headers },
  });
}
function html(request, body, status = 200) {
  return response(request.method === 'HEAD' ? null : body, status, {
    'content-type': 'text/html; charset=utf-8',
    'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-robots-tag': 'noindex, nofollow',
  });
}
function redirect(target, status = 308) {
  return response(null, status, { location: target });
}

async function projectRequest(request, env, project, prefixed) {
  const publicUrl = new URL(request.url);
  const upstreamUrl = new URL(request.url);
  if (prefixed) upstreamUrl.pathname = publicUrl.pathname.slice(project.prefix.length - 1);
  const headers = new Headers(request.headers);
  // Preserve the established trust boundary between the two Workers.
  headers.set('x-shaodian-client-ip', request.headers.get('cf-connecting-ip') || 'unknown');
  const upstreamRequest = new Request(upstreamUrl, new Request(request, { headers }));
  if (!env[project.binding]) return unavailable();
  try {
    const upstream = await env[project.binding].fetch(upstreamRequest);
    const outgoing = new Response(upstream.body, upstream);
    outgoing.headers.set('x-cmi-tools-version', RELEASE);
    const location = upstream.headers.get('location');
    if (prefixed && location) {
      const target = new URL(location, upstreamUrl);
      if (target.origin === PUBLIC_ORIGIN && !target.pathname.startsWith(project.prefix)) {
        const canonical = new URL(PUBLIC_ORIGIN);
        canonical.pathname = project.prefix.slice(0, -1) + target.pathname;
        canonical.search = target.search;
        canonical.hash = target.hash;
        outgoing.headers.set('location', canonical.href);
      }
    }
    // Cookies keep their established names, values, Domain and Path, so existing
    // browser identities continue to reach the same origin and backend records.
    return outgoing;
  } catch {
    return unavailable();
  }
  function unavailable() {
    return upstreamUrl.pathname.startsWith('/api/')
      ? response(JSON.stringify({ error: '捎点服务暂时无法连接，请稍后重试。' }), 503, { 'content-type': 'application/json; charset=utf-8' })
      : html(request, UNAVAILABLE, 503);
  }
}

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    if (url.hostname !== 'tool.cmi.community') return response('Not found', 404);
    if (url.protocol === 'http:') {
      url.protocol = 'https:';
      return redirect(url.href);
    }
    for (const project of PROJECTS) {
      if (url.pathname === project.prefix.slice(0, -1)) return redirect(project.prefix + url.search);
      if (url.pathname === project.prefix + 'index.html') return redirect(project.prefix + url.search);
      if (url.pathname.startsWith(project.prefix)) return projectRequest(request, env, project, true);
    }
    // Previously opened root-based pages must still be able to finish their
    // requests without losing cookies, request bodies, methods or the Origin.
    if (url.pathname.startsWith('/api/') || LEGACY_ASSETS.has(url.pathname)) {
      return projectRequest(request, env, PROJECTS[0], false);
    }
    if (!['GET', 'HEAD'].includes(request.method)) return response(null, 405, { allow: 'GET, HEAD' });
    if (url.pathname === '/legacy-shaodian.js') {
      return response(request.method === 'HEAD' ? null : LEGACY_SCRIPT, 200, {
        'content-type': 'application/javascript; charset=utf-8',
        'x-content-type-options': 'nosniff',
      });
    }
    const home = url.pathname === '/' || url.pathname === '/index.html';
    return html(request, home ? HOME : NOT_FOUND, home ? 200 : 404);
  },
};
