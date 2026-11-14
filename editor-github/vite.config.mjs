import {fileURLToPath} from 'node:url';
import {resolve,normalize} from 'node:path';
import upstream from '../editor-original/apps/web/vite.config.js';
import {overlayApp} from './overlay.mjs';
import {createLocalApi} from './local-api.mjs';
const here=fileURLToPath(new URL('.',import.meta.url));
const root=resolve(here,'../editor-original/apps/web'),original=resolve(root,'../..'),component=resolve(here,'GithubPanel.jsx');
export default {
 ...upstream,root,base:'/',
 resolve:{...upstream.resolve,dedupe:['react','react-dom','@tiptap/core','@tiptap/react','@tiptap/pm']},
 server:{host:'localhost',port:5173,strictPort:true,allowedHosts:['localhost'],fs:{strict:true,allow:[original,here],deny:['.env','.env.*','*.{crt,pem}','**/.git/**','**/.dev.vars*','**/sessions.enc','**/apps/server/data/**']}},
 plugins:[{name:'korean-editor-github-overlay',enforce:'pre',
  configureServer(server){server.middlewares.use(createLocalApi())},
  transform(code,id){if(normalize(id.split('?')[0])!==resolve(root,'src/App.jsx'))return;return {code:overlayApp(code,component),map:null}}
 }]
};
