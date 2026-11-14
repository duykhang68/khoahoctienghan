import data from '../data/techblog/posts.json';
import {inferCategory,categoryIndex} from './tech-categories.mjs';
export {inferCategory};

export type TechVisual = {
  kind: 'swatches'|'buttons'|'type'|'spacing'|'wireframe'|'table'|'flow'|'bars'|'code';
  caption: string;
  variant?: 'summary'|'cycle';
  title?: string;
  centerLabel?: [string,string];
  items?: {label:string;icon?:string;value?:string;detail?:string;color?:string;foreground?:string;hover?:string;size?:number;weight?:number}[];
  layout?: 'listing'|'article'|'responsive';
  columns?: string[];
  rows?: string[][];
  unit?: string;
  source?: string;
  language?: string;
  code?: string;
};
export type TechPost = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  sections: { heading: string; paragraphs: string[]; visuals?: TechVisual[] }[];
  issues: number[];
  author?: string;
  cover?: string;
  coverAlt?: string;
  coverCaption?: string;
  readingMinutes?: number;
};
export const posts = (data as TechPost[]).slice().sort((a,b) => Date.parse(b.date) - Date.parse(a.date));
export const dateLabel = (date:string) => new Intl.DateTimeFormat('vi-VN', {dateStyle:'long', timeStyle:'medium', timeZone:'Asia/Ho_Chi_Minh', hour12:false}).format(new Date(date));
export const yearLabel = (date:string) => new Intl.DateTimeFormat('en', {year:'numeric',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(date));
export const readingMinutes = (post:TechPost) => post.readingMinutes ?? Math.max(1,Math.ceil([post.title,post.summary,...post.sections.flatMap(s=>[s.heading,...s.paragraphs])].join(' ').trim().split(/\s+/).length/200));
export const categories = categoryIndex(posts);
export const archiveYears = [...new Set(posts.map(p=>yearLabel(p.date)))];
export function coverURL(path:string|undefined,base:string) {
  if (!path) return undefined;
  // Cover paths are repository-local; do not copy third-party artwork into the theme.
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('..')) return undefined;
  return path.startsWith(base+'/') ? path : base+path;
}
