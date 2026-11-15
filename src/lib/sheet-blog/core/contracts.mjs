export const sheetId='1VjRyBhkVTkTg5G8ZoLXTkEio-YbWYU5G5dLgfGjN1j4';
export const scope='https://www.googleapis.com/auth/spreadsheets.readonly';
export const clean=v=>String(v??'').trim();
export const equal=(a,b)=>clean(a).normalize('NFC').toLocaleLowerCase('vi')===clean(b).normalize('NFC').toLocaleLowerCase('vi');
export const validClient=value=>/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(value);
