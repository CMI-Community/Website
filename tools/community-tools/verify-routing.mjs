import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { renderHome } from './pages.mjs';
import { PROJECTS } from './projects.mjs';

const images = new URL('./images/', import.meta.url);
// Match the ArrayBuffer export of a Worker data module in the Node checks.
const hooks = registerHooks({
  load(url, context, nextLoad) {
    if (!url.startsWith(images.href) || !url.endsWith('.webp')) return nextLoad(url, context);
    return {
      format: 'module',
      source: `import { readFileSync } from 'node:fs';
        export default Uint8Array.from(readFileSync(new URL(import.meta.url))).buffer;`,
      shortCircuit: true,
    };
  },
});
const { default: handler } = await import('./worker.mjs');
hooks.deregister();

const origin='https://tool.cmi.community';let count=0;
async function check(name,fn){await fn();count++;console.log('PASS '+name)}
const request=(path,options)=>new Request(origin+path,options);
const env={SHAODIAN:{fetch:async r=>new Response(JSON.stringify({url:r.url,method:r.method,body:await r.text(),cookie:r.headers.get('cookie'),origin:r.headers.get('origin'),ip:r.headers.get('x-shaodian-client-ip')}),{headers:{'content-type':'application/json','set-cookie':'seat_owner='+'a'.repeat(64)+'; Path=/; HttpOnly; Secure; SameSite=Lax'}})}};
await check('directory root and unknown tool isolated',async()=>{assert.match(await(await handler.fetch(request('/'),env)).text(),/社区里/);assert.equal((await handler.fetch(request('/another-tool/'),env)).status,404)});
await check('prefix slash redirect preserves query',async()=>{const r=await handler.fetch(request('/shaodian?x=1'),env);assert.equal(r.status,308);assert.equal(r.headers.get('location'),'/shaodian/?x=1')});
await check('app document is proxied and legacy index canonicalizes without loops',async()=>{const r=await handler.fetch(request('/shaodian/'),env);assert.equal(r.status,200);assert.equal((await r.json()).url,origin+'/');const alias=await handler.fetch(request('/shaodian/index.html?x=1'),env);assert.equal(alias.status,308);assert.equal(alias.headers.get('location'),'/shaodian/?x=1')});
await check('all frontend assets and query preserve paths',async()=>{for(const p of ['app.js','board.js','account.js','components.js','components.css','route.js','flight.js','style.css','brand/cmi-community-logo.png']){const d=await(await handler.fetch(request('/shaodian/'+p+'?v=1'),env)).json();assert.equal(d.url,origin+'/'+p+'?v=1')}});
await check('GET api requests preserve filters and identity',async()=>{const r=await handler.fetch(request('/shaodian/api/board?fromCity=%E6%B8%85%E8%BF%88',{headers:{cookie:'seat_owner='+'a'.repeat(64)}}),env);const d=await r.json();assert.equal(d.url,origin+'/api/board?fromCity=%E6%B8%85%E8%BF%88');assert.equal(d.cookie,'seat_owner='+'a'.repeat(64));assert.equal(r.headers.get('set-cookie'),'seat_owner='+'a'.repeat(64)+'; Path=/; HttpOnly; Secure; SameSite=Lax')});
await check('POST operations preserve method body cookies Origin and IP',async()=>{for(const api of ['listings','interest','booking','close','handover','receipt','recruitment','auth/login','identity']){const body=JSON.stringify({id:'synthetic',items:'合成测试书籍',weight:500});const r=await handler.fetch(request('/shaodian/api/'+api,{method:'POST',body,headers:{'content-type':'application/json',origin,cookie:'seat_owner='+'a'.repeat(64),'cf-connecting-ip':'192.0.2.10'}}),env);const d=await r.json();assert.equal(d.method,'POST');assert.equal(d.body,body);assert.equal(d.origin,origin);assert.equal(d.ip,'192.0.2.10');assert.equal(d.url,origin+'/api/'+api)}});
await check('old open tabs retain root API and assets compatibility',async()=>{for(const p of ['/api/board','/api/listings','/app.js','/board.js','/brand/cmi-community-logo.png']){const method=p==='/api/listings'?'POST':'GET';const r=await handler.fetch(request(p,{method,body:method==='POST'?'test':undefined}),env);assert.equal((await r.json()).url,origin+p)}});
await check('same-origin response redirects stay inside shaodian prefix',async()=>{for(const loc of ['/','#mine','/?x=1#composer',origin+'/api/account']){const e={SHAODIAN:{fetch:async()=>new Response(null,{status:303,headers:{location:loc}})}};const r=await handler.fetch(request('/shaodian/api/auth/login',{method:'POST',body:'{}'}),e);assert.ok(new URL(r.headers.get('location')).pathname.startsWith('/shaodian/'))}});
await check('existing canonical and external redirects are not rewritten',async()=>{for(const loc of [origin+'/shaodian/#mine','https://example.com/done']){const r=await handler.fetch(request('/shaodian/'),{SHAODIAN:{fetch:async()=>new Response(null,{status:302,headers:{location:loc}})}});assert.equal(r.headers.get('location'),loc)}});
await check('legacy hash migration script exists',async()=>{const h=await(await handler.fetch(request('/'),env)).text();assert.match(h,/legacy-shaodian.js/);assert.match(await(await handler.fetch(request('/legacy-shaodian.js'),env)).text(),/location.replace/)});
await check('HTTP redirect is restricted to correct host',async()=>{let r=await handler.fetch(new Request('http://tool.cmi.community/shaodian/?x=1'),env);assert.equal(r.status,308);assert.equal(r.headers.get('location'),origin+'/shaodian/?x=1');r=await handler.fetch(new Request('https://cmi.community/'),env);assert.equal(r.status,404)});
await check('directory method limits do not block project POST',async()=>{assert.equal((await handler.fetch(request('/',{method:'POST'}),env)).status,405);assert.equal((await handler.fetch(request('/shaodian/api/listings',{method:'POST',body:'{}'}),env)).status,200)});
await check('binding failure has HTML and JSON states',async()=>{for(const env of [{},{SHAODIAN:{fetch:async()=>{throw Error('unavailable')}}}]){assert.equal((await handler.fetch(request('/shaodian/'),env)).status,503);const api=await handler.fetch(request('/shaodian/api/board'),env);assert.equal(api.status,503);assert.ok((await api.json()).error)}});
await check('HEAD directory has no body and release identity',async()=>{const r=await handler.fetch(request('/',{method:'HEAD'}),env);assert.equal(await r.text(),'');assert.equal(r.headers.get('x-cmi-tools-version'),'directory-20261126')});
await check('external projects render as direct links with creator and artwork', async () => {
  const home = await handler.fetch(request('/'), env);
  const html = await home.text();
  assert.match(home.headers.get('content-security-policy'), /img-src 'self'/);
  assert.equal([...html.matchAll(/<article class="project">/g)].length, 7);
  for (const project of PROJECTS.filter(project => project.href)) {
    assert.equal(new URL(project.href).protocol, 'https:');
    assert.ok(html.includes(`href="${project.href}"`));
    assert.ok(html.includes(`src="${project.image}"`));
    assert.ok(html.includes(project.name) && html.includes(project.description));
    assert.ok(html.includes(`</span>${project.creator}</p>`));
  }
  assert.ok(html.includes('href="https://linklinkguan.github.io/cmi-loykrathong-cards/#river"'));
  const noCreator = renderHome([{ ...PROJECTS[0], creator: '   ' }]);
  assert.ok(!noCreator.includes('<p class="creator">'));
  const specialText = renderHome([{ ...PROJECTS[0], creator: '林&<可>' }]);
  assert.ok(specialText.includes('林&amp;&lt;可&gt;'));
});
await check('artwork is returned from a same-origin cacheable read-only route', async () => {
  for (const project of PROJECTS.filter(project => project.image)) {
    const response = await handler.fetch(request(project.image), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/webp');
    assert.match(response.headers.get('cache-control'), /^public/);
    const source = readFileSync(new URL(`./images/${project.id}.webp`, import.meta.url));
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), source);
    const head = await handler.fetch(request(project.image, { method: 'HEAD' }), env);
    assert.equal(head.status, 200);
    assert.equal(head.headers.get('content-length'), String(source.length));
    assert.equal(await head.text(), '');
    assert.equal((await handler.fetch(request(project.image, { method: 'POST' }), env)).status, 405);
  }
  assert.equal((await handler.fetch(request('/project-images/other.webp'), env)).status, 404);
});
console.log('RESULT '+count+' route groups passed; no production writes');
