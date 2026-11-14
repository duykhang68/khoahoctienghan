import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',workers:1,retries:0,timeout:30000,
 reporter:'list',
 use:{baseURL:'http://127.0.0.1:4321/khoahoctienghan/',trace:'retain-on-failure'},
 projects:[{name:'desktop-chromium',use:{...devices['Desktop Chrome']}},{name:'mobile-chromium',use:{...devices['Pixel 7']}}],
 webServer:{command:'npm run preview -- --host 127.0.0.1 --port 4321',url:'http://127.0.0.1:4321/khoahoctienghan/',reuseExistingServer:false,timeout:30000}
});
