import assert from 'node:assert/strict';
import {normalizeMetadata} from '../../../src/lib/studio-metadata.mjs';
import {normalizeDocument,documentText} from '../../../src/lib/studio-document.mjs';
import {articleInputs,localArticleDate,planLocalArticle} from '../../../core/editorial/local-publication.mjs';
export {slugify} from '../../../editor-github/core/local-draft.mjs';
export function prepareArticle(draft,snapshot,now){
 const input=articleInputs(draft),assets=new Map(),body=normalizeDocument(draft.body,{assets}),bodyText=documentText(body);
 assert(bodyText.trim()||assets.size,'Bài viết chưa có nội dung');
 const metadata=normalizeMetadata(draft),date=localArticleDate(now??new Date());
 return planLocalArticle(draft,snapshot,{...input,body,bodyText,assets,metadata,date});
}
