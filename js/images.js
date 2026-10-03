// ── IMAGES ─────────────────────────────────────────────────────────────────
function handleFileImages(input){
  Array.from(input.files).forEach(file=>{
    compressImage(file).then(d=>{tradeImages.push(d);renderImgPreviews();}).catch(()=>alert('Could not read image.'));
  });
}
function renderImgPreviews(){
  const row=document.getElementById('imgPreviewRow');row.innerHTML='';
  tradeImages.forEach((src,i)=>{
    const w=document.createElement('div');w.className='img-preview-wrap';
    w.innerHTML=`<img src="${src}" class="img-preview" onclick="openLightbox(this)"/><button class="img-remove-btn" onclick="removeImg(${i})">✕</button>`;
    row.appendChild(w);
  });
}
function removeImg(i){tradeImages.splice(i,1);renderImgPreviews();}
function openLightbox(el){document.getElementById('lightboxImg').src=el.src;document.getElementById('lightboxOverlay').classList.add('open');}
function closeLightbox(){document.getElementById('lightboxOverlay').classList.remove('open');}
document.addEventListener('paste',e=>{
  if(!document.getElementById('modalOverlay').classList.contains('open'))return;
  const items=e.clipboardData?.items;if(!items)return;
  for(const item of items){if(item.type.startsWith('image/')){compressImage(item.getAsFile()).then(d=>{tradeImages.push(d);renderImgPreviews();});break;}}
});

