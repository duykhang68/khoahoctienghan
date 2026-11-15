// Each guarded course mutation targets at most one row. D1 meta.changes includes trigger side effects.
// Zero remains a conflict; missing or invalid metadata must not confirm a write.
const courseWriteChanged=result=>result?.success!==false&&Number.isSafeInteger(result?.meta?.changes)&&result.meta.changes>0;
const courseEscape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");
import {courseLevels,courseLabels} from '../course-management/core.mjs';

export {courseWriteChanged,courseEscape,courseLevels,courseLabels};
