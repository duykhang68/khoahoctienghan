const courseEscape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");
import {courseLabels} from '../course-management/core.mjs';
export {courseEscape,courseLabels};
export {courseLevels} from '../../core/course/validation.mjs';
export {courseWriteChanged} from '../../core/course/write-result.mjs';
