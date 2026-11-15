// P2.8: explicit private editorial approval; never create public content.
export function releaseChecks(row){
 return [
  ['Mô tả khóa học',row.description_length>0],
  ['Có chương và bài học',row.chapters>0&&row.lessons>0],
  ['Mỗi chương có bài học',row.empty_chapters===0],
  ['Mỗi bài có nội dung đã lưu',row.lessons>0&&row.missing_lessons===0],
  ['Media có phiên bản bất biến',row.media_links===0]
 ];
}

/** @param {Readonly<{row:Readonly<Record<string,number|string>>,release:unknown}>|null} state */
export function evaluateReleaseReadiness(state,version,revision){
 if(!state)return {kind:'not-found'};
 if(state.row.status!=='draft'||state.release||state.row.version!==version||state.row.revision!==revision||!releaseChecks(state.row).every(x=>x[1]))return {kind:'conflict'};
 return {kind:'write',expectedVersion:version,expectedRevision:revision};
}
