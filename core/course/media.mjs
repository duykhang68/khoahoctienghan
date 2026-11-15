const driveId=/^[A-Za-z0-9_-]{10,150}$/;
const driveTypes=new Set(['video/mp4','video/webm','audio/mpeg','audio/mp4','audio/wav','audio/ogg','audio/webm','audio/x-wav']);
export function eligibleCourseMedia(file,folder){
 return !!file&&driveId.test(file.id||'')&&driveTypes.has(file.mimeType)&&file.trashed===false&&Array.isArray(file.parents)&&file.parents.includes(folder)&&file.capabilities?.canDownload===true&&typeof file.name==='string'&&file.name.length<=1000&&/^\d{1,15}$/.test(file.size||'')&&Number(file.size)>0;
}
export {driveId};
