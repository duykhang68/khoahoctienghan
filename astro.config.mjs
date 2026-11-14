import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  output: 'static',
  ...(process.env.SITE_URL ? { site: process.env.SITE_URL } : {}),
  integrations: [starlight({
    title: 'Tri thức Hàn Quốc',
    description: 'Kho tri thức Hàn Quốc bằng tiếng Việt: ngôn ngữ, lịch sử, văn hóa và đời sống.',
    locales: { root: { label: 'Tiếng Việt', lang: 'vi' } },
    customCss: ['./src/styles/knowledge.css'],
    components: {
      ThemeProvider: './src/components/LightTheme.astro',
      ThemeSelect: './src/components/NoThemeSelect.astro',
    },
    tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
    sidebar: [
      { label: 'Khám phá', link: '/' },
      { label: "Ngôn ngữ Hàn Quốc", autogenerate: { directory: 'ngon-ngu' }, collapsed: true },
      { label: "Lịch sử Hàn Quốc", autogenerate: { directory: 'lich-su' }, collapsed: true },
      { label: "Văn hóa và xã hội", autogenerate: { directory: 'van-hoa' }, collapsed: true },
      { label: "Ẩm thực", autogenerate: { directory: 'am-thuc' }, collapsed: true },
      { label: "Địa lý và du lịch", autogenerate: { directory: 'dia-ly-du-lich' }, collapsed: true },
      { label: "Kinh tế và công nghệ", autogenerate: { directory: 'kinh-te-cong-nghe' }, collapsed: true },
      { label: "Giáo dục và du học", autogenerate: { directory: 'giao-duc-du-hoc' }, collapsed: true },
      { label: "Giải trí và Hallyu", autogenerate: { directory: 'hallyu' }, collapsed: true },
      { label: "Đời sống tại Hàn Quốc", autogenerate: { directory: 'doi-song' }, collapsed: true },
      { label: "Chính trị và thể chế", autogenerate: { directory: 'the-che' }, collapsed: true },
    ],
  })],
});
