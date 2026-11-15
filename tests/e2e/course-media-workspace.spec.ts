import {test,expect} from '@playwright/test';
import worker from '../../back-office/worker.mjs';
import {fixtureDb,ownerCookie,origin,config} from '../../back-office/course-integration-fixture.mjs';

test('P2.5 media workspace filters real associations, links and unlinks through guarded routes, preserves offline state',async({page})=>{
 const {sql,db}=fixtureDb(),id='11111111-1111-4111-8111-111111111111',ch='22222222-2222-4222-8222-222222222222',l='33333333-3333-4333-8333-333333333333',path='/admin/courses/'+id+'/lessons/'+l+'/media/',url=origin+path,cookie=await ownerCookie();
 const folder='fixture-folder-123',video='fixture-video-123',audio='fixture-audio-123',foreign='fixture-foreign-123',missing='fixture-missing-123';
 const original=globalThis.fetch;let offline=false;
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const der=Buffer.from(await crypto.subtle.exportKey('pkcs8',pair.privateKey)).toString('base64'),pem=['BEGIN','END'].map(k=>['-----'+k,'PRIVATE KEY-----'].join(' '));
 const file=(id:string,name:string,mimeType:string,parents=[folder])=>({id,name,mimeType,parents,trashed:false,size:'1000000',capabilities:{canDownload:true}});
 const rows=[file(video,'Bài nghe 한글.mp4','video/mp4'),file(audio,'Phát âm.mp3','audio/mpeg'),file(foreign,'Foreign fixture','video/mp4',['other-folder-123'])];
 const env={...config,COURSE_DB:db,COURSE_MEDIA_FOLDER_ID:folder,GOOGLE_SERVICE_ACCOUNT_JSON:JSON.stringify({type:'service_account',client_email:'fixture@example.iam.gserviceaccount.com',private_key:[pem[0],...der.match(/.{1,64}/g)!,pem[1]].join('\n')})};
 const call=(suffix='',session=cookie,headers={})=>worker.fetch(new Request(url+suffix,{headers:{Cookie:session,...headers}}),env);
 try{
  globalThis.fetch=async(input,init)=>{
   const u=new URL(String(input));if(u.origin==='https://oauth2.googleapis.com'){return new Response(JSON.stringify({access_token:'fixture'}),{status:offline?503:200});}
   if(u.origin==='https://www.googleapis.com'){expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer fixture');const key=u.pathname.split('/').at(-1);
    if(key===folder)return Response.json({id:folder,mimeType:'application/vnd.google-apps.folder',trashed:false});
    if(key==='files')return Response.json({files:rows});
    if(u.searchParams.get('alt')==='media')return new Response(new Uint8Array([1,2,3]),{status:206,headers:{'Content-Range':'bytes 0-2/3','Content-Length':'3'}});
    return Response.json(rows.find(f=>f.id===key)??{}, {status:rows.some(f=>f.id===key)?200:404});
   }
   throw Error('Unexpected outbound request');
  };
  sql.prepare("INSERT INTO courses(id,slug,title,description,level,status,version,created_at,updated_at,updated_by) VALUES(?,?,?,?,?,'draft',1,1,1,'fixture')").run(id,'hangul','Tiếng Hàn','Fixture','beginner');
  sql.prepare('INSERT INTO course_curricula VALUES(?,?,?,?,?)').run(id,1,JSON.stringify([{id:ch,title:'Chương',lessons:[{id:l,title:'한글'}]}]),1,'fixture');
  sql.prepare('INSERT INTO course_lesson_media VALUES(?,?,?,?,?)').run(id,l,video,1,'fixture');
  sql.prepare('INSERT INTO course_lesson_media VALUES(?,?,?,?,?)').run(id,l,missing,1,'fixture');
  expect((await call('','')).status).toBe(403);expect((await call('stream/'+audio+'/')).status).toBe(404);
  const stream=await call('stream/'+video+'/',cookie,{Range:'bytes=0-2'});expect(stream.status).toBe(206);expect(stream.headers.get('content-range')).toBe('bytes 0-2/3');
  await page.route(origin+'/**',async route=>{const req=route.request();const res=await worker.fetch(new Request(req.url(),{method:req.method(),headers:{...await req.allHeaders(),Cookie:cookie},...(req.postData()!==null?{body:req.postData()!}:{})}),env);await route.fulfill({status:res.status,headers:Object.fromEntries(res.headers),body:Buffer.from(await res.arrayBuffer())});});
  await page.goto(url);await expect(page.getByText('Đã kết nối · Chỉ đọc')).toBeVisible();await expect(page.getByRole('heading',{name:'Bài nghe 한글.mp4'})).toBeVisible();await expect(page.locator('video')).toHaveAttribute('src',path+'stream/'+video+'/');await expect(page.getByText('Foreign fixture')).toHaveCount(0);await expect(page.getByText('Chưa xác minh được file')).toBeVisible();
  await page.getByLabel('Tìm media').fill('phat am');await expect(page.locator('[data-dm-card]:visible')).toHaveCount(1);await page.getByLabel('Loại media').selectOption('video');await expect(page.locator('#dm-empty-filter')).toBeVisible();await page.getByRole('button',{name:'Đặt lại'}).click();await expect(page.locator('[data-dm-card]:visible')).toHaveCount(3);
  await page.getByLabel('Liên kết',{exact:true}).selectOption('unlinked');await expect(page.locator('[data-dm-card]:visible')).toHaveCount(1);
  await page.getByRole('button',{name:'+ Gắn vào bài học',exact:true}).click();await expect(page.locator('audio')).toHaveAttribute('src',path+'stream/'+audio+'/');expect(sql.prepare('SELECT count(*) AS n FROM course_lesson_media').get()?.n).toBe(3);
  const audioCard=page.locator('[data-dm-card]').filter({has:page.getByRole('heading',{name:'Phát âm.mp3'})});await audioCard.getByRole('button',{name:'Bỏ liên kết'}).click();await expect(page.locator('audio')).toHaveCount(0);expect(sql.prepare('SELECT count(*) AS n FROM course_lesson_media').get()?.n).toBe(2);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
  offline=true;const response=await page.reload();expect(response?.status()).toBe(503);await expect(page.getByText('Không kết nối được Drive.',{exact:false})).toBeVisible();await expect(page.getByRole('button',{name:'Bỏ liên kết'})).toHaveCount(2);expect(sql.prepare('SELECT count(*) AS n FROM course_lesson_media').get()?.n).toBe(2);
 }finally{await page.unrouteAll({behavior:'wait'});globalThis.fetch=original;sql.close();}
});
