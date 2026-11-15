export async function webp(file){
 if(!file||!/^image\/(?:png|jpeg|webp|gif|avif|bmp)$/.test(file.type)||file.size>30_000_000)throw Error('Chọn ảnh raster PNG/JPEG/WebP/GIF/AVIF/BMP tối đa 30 MB.');
 const img=await createImageBitmap(file);try{if(img.width*img.height>64_000_000)throw Error('Ảnh quá lớn.');
 const scale=Math.min(1,1600/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);
 const blob=await new Promise(resolve=>c.toBlob(resolve,'image/webp',.85));if(!blob||blob.type!=='image/webp'||blob.size>1_500_000)throw Error('Không thể tối ưu WebP dưới 1,5 MB.');
 return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({src:reader.result,width:c.width,height:c.height,size:blob.size});reader.onerror=reject;reader.readAsDataURL(blob)});
 }finally{img.close()}
}
