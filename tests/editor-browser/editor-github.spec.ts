import {test,expect} from '@playwright/test';
test('original editor opens without Google or Cashflow and displays independent GitHub control',async({page})=>{
 await page.goto('/');
 await expect(page).toHaveURL('http://localhost:5173/');
 await expect(page.getByRole('button',{name:'Kết nối GitHub',exact:true})).toBeVisible();
 await expect(page.getByText('Không gian viết của bạn',{exact:false})).toBeVisible();
 await expect(page.getByText('Thêm khối bài viết',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'✦ Auto Visualize'})).toBeVisible();
 const title=page.getByPlaceholder('Bắt đầu bằng một tiêu đề hay…');
 await title.fill('Bản nháp thử nghiệm');
 await expect(title).toHaveValue('Bản nháp thử nghiệm');
 const canvas=page.locator('.tiptap[contenteditable="true"]');
 await expect(canvas).toBeVisible();await canvas.fill('Viết thử không cần Cashflow');
 await expect(canvas).toContainText('Viết thử không cần Cashflow');
 await expect(page.getByRole('region',{name:'GitHub Publishing'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Gửi bài mới → Draft PR'})).toBeDisabled();
 const status=await page.request.get('/api/github-editor/session');expect(status.ok()).toBeTruthy();expect((await status.json()).connected).toBe(false);
 const drive=await page.request.get('/api/drive-client-config');expect(drive.ok()).toBeTruthy();expect((await drive.json()).configured).toBe(false);
});
