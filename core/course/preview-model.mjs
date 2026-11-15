/** @param {Readonly<{chapters:readonly Readonly<{lessons:readonly Readonly<{id:string,title:string}>[]}>[]}>} curr */
export function buildCoursePreviewModel(curr,selected){
 const entries=curr.chapters.flatMap(ch=>ch.lessons),pos=entries.findIndex(l=>l.id===selected?.id);
 return {entries,pos};
}
