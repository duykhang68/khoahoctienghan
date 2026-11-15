import data from '../data/techblog/posts.json';
import {inferCategory} from './tech-categories.mjs';
import {techIndex,dateLabel as formatDate,yearLabel as formatYear,readingMinutes as estimateReadingMinutes,coverURL as resolveCover} from '../../core/editorial/content-index.mjs';
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
  studioBody?: unknown;
  labels?: string[];
  series?: {name:string;part:number;total_parts:number;target_date:string;status:'completed'|'in_progress'};
  author?: string;
  cover?: string;
  coverAlt?: string;
  coverCaption?: string;
  readingMinutes?: number;
};
const index=techIndex(data as TechPost[]);
export const posts:TechPost[]=index.posts;
export const categories=index.categories;
export const archiveYears=index.archiveYears;
export const dateLabel=(date:string)=>formatDate(date);
export const yearLabel=(date:string)=>formatYear(date);
export const readingMinutes=(post:TechPost)=>estimateReadingMinutes(post);
export function coverURL(path:string|undefined,base:string){return resolveCover(path,base);}
