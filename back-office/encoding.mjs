const enc=new TextEncoder(), dec=new TextDecoder();
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const json=s=>JSON.parse(dec.decode(unb64(s)));

export {enc,dec,b64,unb64,json};
