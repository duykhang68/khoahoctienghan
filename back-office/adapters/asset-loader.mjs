import {editorBundle} from '../generated/editor-assets.mjs';
import {sheetsBundle} from '../generated/sheets-assets.mjs';

// Exact own-key allowlist; preserve Editor precedence. Authorization is
// enforced by the Worker before this lookup. No filesystem or URL resolution.
export function findPrivateAsset(name) {
 const assets=Object.hasOwn(editorBundle.assets,name)?editorBundle.assets:sheetsBundle.assets;
 return Object.hasOwn(assets,name)?assets[name]:null;
}
