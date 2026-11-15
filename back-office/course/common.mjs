const courseEscape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");
const courseLabels={beginner:'Sơ cấp',intermediate:'Trung cấp',advanced:'Cao cấp',all:'Mọi trình độ',draft:'Bản nháp',ready:'Sẵn sàng',archived:'Lưu trữ'};
export {courseEscape,courseLabels};
export {courseLevels} from '../../core/course/validation.mjs';
export {courseWriteChanged} from '../../core/course/write-result.mjs';
