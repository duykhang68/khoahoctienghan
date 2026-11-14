export const PAGE_SIZE=6;
export function pageWindow(total,requested){
 const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
 const parsed=Number(requested||1);
 const page=Number.isSafeInteger(parsed)&&parsed>0?Math.min(parsed,pages):1;
 return {pages,page,start:(page-1)*PAGE_SIZE,end:Math.min(total,page*PAGE_SIZE)};
}
export function pageNumbers(page,pages){
 return [...new Set([1,page-1,page,page+1,pages].filter(n=>n>=1&&n<=pages))].sort((a,b)=>a-b);
}
