// A draft describes the selected episode, not an observed number of published episodes.
const day=86400000;
function dayNumber(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const timestamp=Date.parse(value+'T00:00:00Z');
 if(!Number.isFinite(timestamp)||new Date(timestamp).toISOString().slice(0,10)!==value)return null;
 return timestamp/day;
}
export function seriesProgress(series={},now=new Date()){
 const part=Number(series.part),total=Number(series.total_parts);
 const valid=Number.isInteger(part)&&Number.isInteger(total)&&part>=1&&part<=total&&total<=9999;
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const deadline=dayNumber(series.target_date),current=dayNumber(today);
 const days=deadline===null||current===null?null:deadline-current;
 return {valid,part:valid?part:null,total:valid?total:null,percent:valid?part/total*100:null,remainingPercent:valid?(total-part)/total*100:null,remainingParts:valid?total-part:null,days};
}
