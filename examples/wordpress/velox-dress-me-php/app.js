(() => {
  'use strict';
  document.querySelectorAll('.vda').forEach(root => {
    const q = s => root.querySelector(s), form=q('form'), status=q('[data-status]');
    const inputs={personal:form.elements.personal,product:form.elements.product};
    let session, busy=false, resultFile, resultURL, active=null;
    const chosen={}, uploaded={}, uploadRefs={}, urls={}, fingerprints={}, uploading={};
    const storeKey='velox-wp:'+root.dataset.endpoint;
    const message=s=>{status.textContent=s;};
    function persist() { localStorage.setItem(storeKey,JSON.stringify({active,uploaded,uploadRefs,fingerprints})); }
    function sync() {
      const allowed=!!session&&form.elements.consent.checked;
      for(const role of ['personal','product'])inputs[role].disabled=!allowed||busy||!!active||!!uploading[role]||!!(uploadRefs[role]&&!uploaded[role]);
      q('[data-generate]').disabled=!allowed||busy||!!active||!!uploading.personal||!!uploading.product||!chosen.personal||!chosen.product||(session?.mode!=='preview'&&(!uploaded.personal||!uploaded.product));
    }
    function uploadMessage() {
      if(uploading.personal||uploading.product)message('Uploading selected images now. Velox can prepare each image as soon as its upload completes.');
      else if(['personal','product'].some(role=>uploadRefs[role]&&!uploaded[role]))message('An upload needs review. Keep the saved references; no replacement upload will be sent.');
      else if(uploaded.personal&&uploaded.product)message('Both asset IDs are saved. Create my look will use them without uploading again. Background preparation may still be running.');
      else message('Choose the other image when you are ready. The uploaded image can prepare in the background.');
    }
    async function api(path,method='GET',body) {
      const target=new URL(root.dataset.endpoint); // Supports plain WordPress permalinks.
      if(target.searchParams.has('rest_route')) target.searchParams.set('rest_route',target.searchParams.get('rest_route')+path);
      else target.pathname+=path;
      const headers={}; if(session) headers['X-Velox-CSRF']=session.csrf;
      if(body && !(body instanceof FormData)) { headers['Content-Type']='application/json'; body=JSON.stringify(body); }
      const response=await fetch(target,{method,body,headers,credentials:'same-origin',cache:'no-store'});
      const data=await response.json(); if(!response.ok) throw new Error(data.message||'The request needs review.'); return data;
    }
    function clearResult() {
      resultFile=null; if(resultURL) URL.revokeObjectURL(resultURL); resultURL=null;
      for(const el of root.querySelectorAll('[data-before],[data-after],[data-divider],[data-before-label],[data-after-label]')) el.hidden=true;
      q('[data-empty]').hidden=false; q('[data-slider]').disabled=true;
      q('[data-download]').disabled=true;q('[data-share]').disabled=true;
      q('[data-result-tag]').textContent='WAITING FOR YOUR LOOK';
    }
    async function validate(file) {
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024) throw new Error('Choose a JPEG, PNG or WebP up to 5 MB.');
      const bitmap=await createImageBitmap(file);
      const valid=bitmap.width<=8192 && bitmap.height<=8192 && bitmap.width*bitmap.height<=16000000;
      bitmap.close(); if(!valid) throw new Error('Choose an image up to 16 megapixels and 8192 pixels per side.');
    }
    for(const [role,input] of Object.entries(inputs)) input.addEventListener('change', async()=>{
      if(busy||active||uploading[role]||!session||!form.elements.consent.checked) {input.value='';message('Give image permission and finish any existing request before changing images.');return;}
      const file=input.files[0]; if(!file)return;
      uploading[role]=true;sync();
      const badge=q('[data-upload-'+role+']');
      try {
        badge.textContent='Checking image…';
        await validate(file);
        if(uploadRefs[role]&&!uploaded[role]) throw new Error('This upload has an uncertain outcome. Keep its reference for review.');
        const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
        const reuse=session.mode!=='preview'&&fingerprints[role]===digest&&!!uploaded[role];
        chosen[role]=file;
        if(urls[role])URL.revokeObjectURL(urls[role]);urls[role]=URL.createObjectURL(file);
        const name=role==='personal'?'photo':'product';q('[data-'+name+']').src=urls[role];q('[data-'+name+']').hidden=false;q('[data-'+name+'-placeholder]').hidden=true;
        clearResult();
        if(session.mode==='preview'){badge.textContent='Selected locally · no upload';message('Preview only: this image stays in your browser.');return;}
        if(reuse){badge.textContent='Using this image’s saved asset ID';return;}
        // Each selection starts independently; no wait for the other input or the Create button.
        delete uploaded[role];fingerprints[role]=digest;uploadRefs[role]=crypto.randomUUID();persist();
        q('[data-reference]').textContent=Object.entries(uploadRefs).map(([kind,id])=>kind+' upload: '+id).join(' · ');badge.textContent='Uploading now…';uploadMessage();
        const data=new FormData();data.set('role',role);data.set('image',file);data.set('reference',uploadRefs[role]);data.set('consent','yes');
        const asset=await api('upload','POST',data);
        if(asset.status!=='ready')throw new Error('Upload needs review. Keep its reference.');
        uploaded[role]=asset.reference;persist();
        badge.textContent=asset.preparationStatus==='ready'?'Uploaded · product cache ready':asset.preparationStatus==='queued'?'Uploaded · preparation queued':asset.preparationStatus==='preparing'?'Uploaded · preparing in background':asset.preparationStatus==='unavailable'||asset.preparationStatus==='failed'?'Uploaded · preparation not confirmed':'Uploaded · asset ID saved';
      } catch(e){ input.value='';delete chosen[role];badge.textContent=uploadRefs[role]&&!uploaded[role]?'Upload needs review · keep its reference':'Image selection failed';message(e.message); }
      finally{uploading[role]=false;if(session?.mode!=='preview'&&uploaded[role])uploadMessage();sync();}
    });
    form.elements.consent.addEventListener('change',()=>{sync();if(!form.elements.consent.checked)message('Image selection is paused. Previously uploaded images are not deleted or cancelled.');else if(!chosen.personal&&!chosen.product)message(session?.mode==='preview'?'Choose both images to preview the interface.':'Choose either image to upload it immediately and start its preparation.');});
    q('[data-slider]').addEventListener('input',e=>q('[data-stage]').style.setProperty('--split',e.target.value+'%'));
    async function showResult(blob,beforeURL,caption,directURL=null) {
      clearResult();if(blob)resultFile=new File([blob],(session.mode==='preview'?'dress-archive-interface-demo.':'dress-archive-look.')+({'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[blob.type]||'png'),{type:blob.type});
      resultURL=blob?URL.createObjectURL(blob):directURL;q('[data-after]').referrerPolicy='no-referrer';q('[data-after]').src=resultURL;
      if(!blob)await q('[data-after]').decode();
      if(beforeURL){q('[data-before]').src=beforeURL; q('[data-before]').hidden=false; q('[data-divider]').hidden=false;q('[data-before-label]').hidden=false;q('[data-slider]').disabled=false;q('[data-slider]').value=50;q('[data-stage]').style.setProperty('--split','50%');}
      else {q('[data-stage]').style.setProperty('--split','0%');message('Result restored. Select the original photo for a new comparison after saving this image.');}
      q('[data-after]').hidden=false;q('[data-after-label]').hidden=false;q('[data-empty]').hidden=true;q('[data-result-tag]').textContent=caption;
      q('[data-download]').disabled=!resultFile;q('[data-share]').disabled=!resultFile;
      q('[data-share-note]').textContent=!resultFile?'Preparing download and sharing...':navigator.canShare?.({files:[resultFile]})?'Share opens your device’s sharing menu.':'File sharing is unavailable here. Download the image to share it manually.';
    }
    async function samplePNG(url) {
      const img=new Image(); img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;canvas.getContext('2d').drawImage(img,0,0);
      return new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    }
    q('[data-sample]').addEventListener('click',async()=>{
      try {await showResult(await samplePNG(root.dataset.assets+'after.svg'),root.dataset.assets+'before.svg','ILLUSTRATION · NOT AI');message('Illustrated interface demo. No photo was uploaded and no try-on was generated.');}catch(e){message(e.message);}
    });
    q('[data-download]').addEventListener('click',()=>{if(!resultFile)return;const a=document.createElement('a');a.href=resultURL;a.download=resultFile.name;a.click();});
    q('[data-share]').addEventListener('click',async()=>{
      if(!resultFile)return;
      if(!navigator.canShare?.({files:[resultFile]})){message('Use Download image, then attach it in your preferred social app.');return;}
      try{await navigator.share({files:[resultFile],title:session.mode==='preview'?'Dress Archive interface demo':'My Dress Archive look'});}catch(e){if(e.name!=='AbortError')message('Sharing did not complete. You can download the image instead.');}
    });
    async function check() {
      if(!active)return;
      const state=await api('jobs/'+active);q('[data-reference]').textContent='Request: '+active;
      if(state.status==='succeeded'){
        const receipt=active;
        let direct=false;
        if(state.resultUrl){
          try{await showResult(null,urls.personal,'YOUR TRY-ON',state.resultUrl);direct=true;}catch(_){/* Recover display through the authorized media endpoint; never resubmit. */}
        }
        const download=async()=>{
          const media=await api('media/'+receipt);const bytes=Uint8Array.from(atob(media.data),c=>c.charCodeAt(0));
          return new Blob([bytes],{type:media.mime});
        };
        if(!direct)await showResult(await download(),urls.personal,'YOUR TRY-ON');
        active=null;persist();q('[data-check]').hidden=true;message('Your look is ready.');sync();
        if(direct){
          // Display first. Export preparation cannot delay the visible result.
          const displayedURL=resultURL;
          requestAnimationFrame(()=>requestAnimationFrame(()=>{
            download().then(blob=>{
              if(resultURL!==displayedURL)return;
              resultFile=new File([blob],'dress-archive-look.'+({'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[blob.type]||'png'),{type:blob.type});
              resultURL=URL.createObjectURL(blob);
              q('[data-download]').disabled=false;q('[data-share]').disabled=false;
              q('[data-share-note]').textContent=navigator.canShare?.({files:[resultFile]})?'Share opens your device sharing menu.':'File sharing is unavailable here. Download the image to share it manually.';
            }).catch(()=>{if(resultURL===displayedURL){active=receipt;persist();q('[data-check]').hidden=false;sync();q('[data-share-note]').textContent='Your look is displayed, but download preparation failed. Use Check existing request to recover it.';}});
          }));
        }
        return true;
      }
      if(state.status==='failed'){active=null;persist();q('[data-check]').hidden=true;message('This try-on failed. No automatic retry was made.');sync();return true;}
      if(state.status==='needs_review') {message('Submission outcome needs review. Keep this reference; no replacement request will be sent.');return true;}
      message(state.status==='queued'?'Your try-on is queued.':'Creating your look…');return false;
    }
    q('[data-check]').addEventListener('click',async()=>{try{await check();}catch(e){message(e.message);}});
    form.addEventListener('submit',async e=>{
      e.preventDefault();if(q('[data-generate]').disabled)return;
      busy=true;sync();
      try {
        if(session.mode==='preview'){
          await showResult(chosen.personal,urls.personal,'ORIGINAL · NO GENERATION');
          message('Preview only: both sides show your original photo. Connect a partner account to generate a real try-on.');return;
        }
        if(!uploaded.personal||!uploaded.product)throw new Error('Wait for both uploads to complete.');
        active=crypto.randomUUID();persist();q('[data-reference]').textContent='Request: '+active;q('[data-check]').hidden=false;
        message('Submitting your try-on…');await api('jobs','POST',{reference:active,personal:uploaded.personal,product:uploaded.product,consent:true});
        const deadline=Date.now()+120000;
        while(Date.now()<deadline){
          const pollStarted=performance.now();
          if(await check())return;
          const remaining=deadline-Date.now();if(remaining<=0)break;
          // One-second start-to-start cadence, never overlapping an in-flight read.
          await new Promise(resolve=>setTimeout(resolve,Math.min(remaining,Math.max(0,1000-(performance.now()-pollStarted)))));
        }
        message('Your request is still saved. Use Check existing request to continue; this does not create another try-on.');
      }catch(e){message(e.message);}finally{busy=false;sync();}
    });
    (async()=>{
      try {
        session=await api('session','POST',{});
        if(root.dataset.preview==='yes')session.mode='preview';
        q('[data-mode]').textContent=session.mode==='preview'?'INTERFACE PREVIEW — no API generation, uploads or credits used.':'LIVE TRY-ON · '+session.integration+' — after permission, choosing an image uploads and prepares it. Create my look uses this account’s generation allowance.';
        q('[data-upload-help]').textContent=session.mode==='preview'?'Give image permission, then explore the interface locally. No images leave this preview.':'Allow image uploads below, then choose your dress and photograph. Each starts preparing in the background as soon as its upload completes.';
        message('Give image permission before choosing your images.');
        q('[data-sample]').hidden=session.mode!=='preview';
        if(session.mode==='preview')q('[data-generate]').textContent='Preview my photograph';
        else {
          const saved=JSON.parse(localStorage.getItem(storeKey)||'{}');Object.assign(uploaded,saved.uploaded||{});Object.assign(uploadRefs,saved.uploadRefs||{});Object.assign(fingerprints,saved.fingerprints||{});active=session.active||saved.active||null;
          for(const role of ['personal','product'])if(uploadRefs[role]){
            const receipt=await api('uploads/'+uploadRefs[role]);
            if(receipt.status==='ready'){uploaded[role]=receipt.reference;q('[data-upload-'+role+']').textContent='Saved upload · reselect the same file to reuse it';}
            else {q('[data-reference]').textContent='Upload: '+uploadRefs[role];message('An earlier upload needs review. Keep its reference; no new upload was sent.');}
          }
          persist();
          if(active){q('[data-check]').hidden=false;message('An earlier request is saved. Check it before submitting another.');q('[data-reference]').textContent='Request: '+active;}
        }
        sync();
      }catch(e){message(e.message);q('[data-mode]').textContent='The dressing room could not start. Please reload or contact the site owner.';}
    })();
  });
})();
