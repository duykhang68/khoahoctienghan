import {readDraftList,putDraft} from '../../../../../editor-github/core/local-draft.mjs';
const KEY='korean-reddit-editor-drafts-v1';
export function readDrafts(storage){try{return readDraftList(storage.getItem(KEY))}catch{return []}}
export function saveDraft(storage,d){const next=putDraft(readDrafts(storage),d);storage.setItem(KEY,JSON.stringify(next));return next;}
