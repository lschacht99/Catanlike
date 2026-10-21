import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';

function fixture(){
  let handle,allowed=true,row,calls=0;
  const sandbox={Request,Response,URL,TextEncoder,TextDecoder,AbortSignal,Uint8Array,crypto:webcrypto,structuredClone,console,
    Deno:{env:{get:key=>key==='SUPABASE_URL'?'https://fixture.supabase.co':'fixture-secret'},serve:fn=>{handle=fn;}},
    fetch:async(url,options={})=>{
      calls++;
      if(url.includes('/rpc/hn_sidequest_rate'))return Response.json(allowed);
      if(options.method==='POST'){row=JSON.parse(options.body);return new Response(null,{status:201});}
      return Response.json(row?[row]:[]);
    }};
  vm.runInNewContext(readFileSync(new URL('./index.ts',import.meta.url),'utf8'),sandbox);
  const call=(action,body,headers={},method=body===undefined?'GET':'POST')=>handle(new Request('https://fixture.supabase.co/functions/v1/game/api/'+action,{method,headers:{'Content-Type':'application/json',...headers},...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})}));
  return {call,get calls(){return calls;},limit:()=>{allowed=false;}};
}
test('invalid and oversized requests cannot touch the database',async()=>{
  const f=fixture();
  for(const [body,status] of [['null',400],['[]',400],['{',400],['"string"',400],[JSON.stringify({padding:'x'.repeat(8193)}),413]])assert.equal((await f.call('create',body)).status,status);
  assert.equal((await f.call('create','{}',{'Content-Type':'text/plain'})).status,415);
  assert.equal((await f.call('create')).status,405);
  assert.equal((await f.call('unknown',{})).status,404);
  assert.equal(f.calls,0);
});
test('distributed quota rejects abuse before a room write',async()=>{
  const f=fixture();f.limit();const r=await f.call('create',{});
  assert.equal(r.status,429);assert.equal(r.headers.get('retry-after'),'60');assert.equal(f.calls,1);
});
test('valid room creation and header token access preserve player privacy',async()=>{
  const f=fixture();const created=await f.call('create',{});assert.equal(created.status,200);
  const session=await created.json();assert.match(session.room,/^[A-HJ-NP-Z2-9]{8}$/);
  assert.equal((await f.call('state?room='+session.room,undefined,{'X-Game-Token':'wrong'})).status,401);
  const r=await f.call('state?room='+session.room,undefined,{'X-Game-Token':session.token});assert.equal(r.status,200);
  const state=await r.json();assert.equal(state.game.p[1].cards,null);assert.equal(JSON.stringify(state).includes(session.token),false);
});
