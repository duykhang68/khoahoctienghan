import {originalDraftKey,restorableOriginalDraft,originalDraftSnapshot} from './core/local-draft.mjs';
export {originalDraftKey};
export function readOriginalDraft(storage,blogId){return restorableOriginalDraft(storage.getItem(originalDraftKey(blogId)));}
export function writeOriginalDraft(storage,blogId,draft,savedAt){storage.setItem(originalDraftKey(blogId),JSON.stringify(originalDraftSnapshot(draft,savedAt)));}
