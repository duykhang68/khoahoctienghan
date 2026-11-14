import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

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
      PageFrame: './src/components/KnowledgeEditorialFrame.astro',
      TwoColumnContent: './src/components/KnowledgeSingleContent.astro',
      Footer: './src/components/KnowledgeArticleFooter.astro',
    },
    tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
    sidebar: [
      // Starlight adds Astro's base to manual sidebar links.
      { label: 'Tech Blog', link: '/techblog/' },
      { label: 'Khám phá', link: '/' },
      { label: "Ngôn ngữ Hàn Quốc", collapsed: true, items: [{ autogenerate: { directory: 'ngon-ngu' } }] },
      { label: "Lịch sử Hàn Quốc", collapsed: true, items: [{ autogenerate: { directory: 'lich-su' } }] },
      { label: "Văn hóa và xã hội", collapsed: true, items: [{ autogenerate: { directory: 'van-hoa' } }] },
      { label: "Ẩm thực", collapsed: true, items: [{ autogenerate: { directory: 'am-thuc' } }] },
      { label: "Địa lý và du lịch", collapsed: true, items: [{ autogenerate: { directory: 'dia-ly-du-lich' } }] },
      { label: "Kinh tế và công nghệ", collapsed: true, items: [{ autogenerate: { directory: 'kinh-te-cong-nghe' } }] },
      { label: "Giáo dục và du học", collapsed: true, items: [{ autogenerate: { directory: 'giao-duc-du-hoc' } }] },
      { label: "Giải trí và Hallyu", collapsed: true, items: [{ autogenerate: { directory: 'hallyu' } }] },
      { label: "Đời sống tại Hàn Quốc", collapsed: true, items: [{ autogenerate: { directory: 'doi-song' } }] },
      { label: "Chính trị và thể chế", collapsed: true, items: [{ autogenerate: { directory: 'the-che' } }] },
    ],
  })],
});
