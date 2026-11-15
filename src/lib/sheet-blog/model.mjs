// Compatibility facade: pure row rules and isolated Sheets I/O.
export {sheetId,scope} from './core/contracts.mjs';
export {checkHeaders,listRows,rowDraft} from './core/sheet-rows.mjs';
export {recommendDestination} from './core/sheet-routing.mjs';
export {sheetsClient} from './sheets-client.mjs';
