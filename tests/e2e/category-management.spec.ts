import {expect} from '@playwright/test';
import {test} from './private-office-fixture';
import {orderedTopics} from '../../src/lib/knowledge-navigation.mjs';
test('P1.4 approved topic order is a strict permutation',()=>{
 const topics=[{id:'a'},{id:'b'}];expect(orderedTopics(topics,['b','a']).map(x=>x.id)).toEqual(['b','a']);expect(()=>orderedTopics(topics,['a','a'])).toThrow();expect(()=>orderedTopics(topics,['a','c'])).toThrow();
});
test('P1.4 category reorder works by keyboard and drag; stale main never writes',async({page,office})=>{
 const sha='a'.repeat(40),rows=[{id:'ngon-ngu',title:'Ngôn ngữ'},{id:'lich-su',title:'Lịch sử'},{id:'van-hoa',title:'Văn hóa'}];
 await page.route(office+'/admin/api/categories/',route=>route.fulfill({json:{sha,rows}}));
 let writes=0;await page.route('https://api.github.com/**',route=>{if(route.request().method()!=='GET')writes++;const url=route.request().url();return route.fulfill({json:url.endsWith('/user')?{login:'duykhang68'}:url.endsWith('/git/ref/heads/main')?{object:{sha:'b'.repeat(40)}}:{full_name:'duykhang68/khoahoctienghan',permissions:{push:true}}})});
 await page.goto(office+'/admin/categories/');const list=page.locator('#cat-list > li');await expect(list).toHaveCount(3);
 const up=page.getByRole('button',{name:'Lên Lịch sử',exact:true});await up.focus();await up.press('Enter');await expect(list.first()).toHaveAttribute('data-id','lich-su');
 if(!/mobile/i.test(test.info().project.name)){await list.last().dragTo(list.first());await expect(list.first()).toHaveAttribute('data-id','van-hoa');}
 await page.locator('#cat-confirm').check();await page.locator('#cat-token').fill('github'+'_pat_'+'fixture');await page.locator('#cat-save').click();await expect(page.locator('#cat-result')).toContainText('Main đã đổi');expect(writes).toBe(0);await expect(page.locator('#cat-token')).toHaveValue('');
 await page.locator('#cat-reset').click();await expect(list.first()).toHaveAttribute('data-id','ngon-ngu');await expect(page.locator('#cat-save')).toBeDisabled();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});