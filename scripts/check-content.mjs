import {createContentFilesystem} from './adapters/content-filesystem.mjs';
import {validateContentPages,validateSidebar,validateTechPosts,validateKnowledgeVisuals,validateStudioReferences,assertUsedStudioDocument,validateArticleMetadata} from '../core/editorial/content-validation.mjs';
import {normalizeDocument,assertImageFiles} from '../src/lib/studio-document.mjs';
const fs=createContentFilesystem(),paths=await fs.paths(),knowledgePages=await fs.pages(paths);
console.log('Validated '+validateContentPages(knowledgePages)+' content files');
validateSidebar(await fs.text('astro.config.mjs'));
const techPosts=await fs.json('src/data/techblog/posts.json');validateTechPosts(techPosts);
const knowledgeVisuals=await fs.json('src/data/knowledge-visuals.json');
const visualCount=validateKnowledgeVisuals(knowledgeVisuals,knowledgePages);
console.log('Validated '+visualCount+' Knowledge Base visual references');
const studioDocs=await fs.json('src/data/studio-documents.json'),studioRefs=validateStudioReferences(knowledgePages,studioDocs);
for(const [id,body] of Object.entries(studioDocs)){assertUsedStudioDocument(studioRefs,id);assertImageFiles(normalizeDocument(body),fs.bytes);}
for(const post of techPosts)if(post.studioBody)assertImageFiles(normalizeDocument(post.studioBody),fs.bytes);
validateArticleMetadata(await fs.json('src/data/studio-metadata.json'),techPosts,studioRefs);
