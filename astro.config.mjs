import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import menu from './src/data/knowledge-menu.json';
import {validateMenu} from './src/lib/knowledge-menu.mjs';
validateMenu(menu);

export default defineConfig({
  output: 'static',
  site: process.env.SITE_URL || 'https://duykhang68.github.io',
  base: process.env.SITE_BASE || '/khoahoctienghan',
  integrations: [starlight({
    title: 'Tri thức Hàn Quốc',
    description: 'Kho tri thức Hàn Quốc bằng tiếng Việt: ngôn ngữ, lịch sử, văn hóa và đời sống.',
    locales: { root: { label: 'Tiếng Việt', lang: 'vi' } },
    customCss: ['./src/styles/knowledge.css'],
    components: {
      ThemeProvider: './src/components/LightTheme.astro',
      ThemeSelect: './src/components/NoThemeSelect.astro',
      Sidebar: './src/components/KnowledgeSidebar.astro',
      PageTitle: './src/components/KnowledgePageTitle.astro',
    },
    tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
    sidebar: menu,
  })],
});
