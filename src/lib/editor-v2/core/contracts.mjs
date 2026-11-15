export const requireValue=(ok,message)=>{if(!ok)throw Error(message)};
export const validText=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=max&&!/[\u0000-\u001f\u007f]/u.test(v);
