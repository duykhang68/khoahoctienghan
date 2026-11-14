import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/editor-browser',
 workers:1,timeout:30000,retries:0,reporter:'list',
 use:{baseURL:'http://localhost:5173/',...devices['Desktop Chrome'],trace:'retain-on-failure'},
 webServer:{command:'npm run editor',url:'http://localhost:5173/api/status',reuseExistingServer:false,timeout:60000},
});
