// ═══════════════════════════════════════════════════════════
// SCROLL REVEAL — subtle entrance for cards/section headers.
// Shared across pages (previously duplicated 3 different ways).
// Usage: initScrollReveal('.some-selector,.another', {stagger:55})
// ═══════════════════════════════════════════════════════════
function initScrollReveal(selector, opts){
  opts=opts||{};
  const stagger=opts.stagger||0;
  const targets=document.querySelectorAll(selector);
  if(!('IntersectionObserver' in window)){targets.forEach(el=>el.classList.add('in'));return;}
  const io=new IntersectionObserver((entries)=>{
    entries.forEach(en=>{
      if(en.isIntersecting){
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  },{threshold:.12,rootMargin:'0px 0px -40px 0px'});
  let group=null,idx=0;
  targets.forEach(el=>{
    if(el.parentElement!==group){group=el.parentElement;idx=0;}
    el.classList.add('reveal');
    if(stagger)el.style.transitionDelay=Math.min(idx*stagger,330)+'ms';
    idx++;
    io.observe(el);
  });
  // Safety net: if the observer ever misses an element (unusual viewport/layout
  // timing, automated tools that don't simulate real scroll), force it visible
  // after a few seconds rather than leaving real content invisible forever.
  setTimeout(()=>{
    targets.forEach(el=>{if(!el.classList.contains('in'))el.classList.add('in');});
  },2500);
}

// ═══════════════════════════════════════════════════════════
// MAGNETIC BUTTONS — cursor-follow pull with a springy return on
// mouseleave. Shared across pages (previously 4 near-duplicate copies).
// Skipped under prefers-reduced-motion and on touch (no cursor to track).
// Usage: initMagnetic('.some-btn,.another-btn', .25)
// ═══════════════════════════════════════════════════════════
function initMagnetic(selector, strength){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  if(matchMedia('(hover: none)').matches)return;
  strength=strength||.25;
  document.querySelectorAll(selector).forEach(el=>{
    let raf=null;
    el.addEventListener('mousemove',e=>{
      const r=el.getBoundingClientRect();
      const tx=(e.clientX-r.left-r.width/2)*strength;
      const ty=(e.clientY-r.top-r.height/2)*strength;
      el.style.transition='';
      if(raf)cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{el.style.transform=`translate(${tx}px,${ty}px)`;});
    });
    el.addEventListener('mouseleave',()=>{
      el.style.transition='transform .5s cubic-bezier(.34,1.56,.64,1)';
      el.style.transform='';
    });
  });
}

// ═══════════════════════════════════════════════════════════
// COUNT-UP — animates a number from 0 up to its real value instead of
// just appearing. Shared across pages (previously 2 divergent signatures:
// about.html's positional countUp(el,end,suffix,duration) and account.html's
// countUp(el,end,opts) — standardized on the options-object form here).
// Usage: countUp(el, 42, {suffix:'%', duration:900})
// ═══════════════════════════════════════════════════════════
function countUp(el,end,opts){
  opts=opts||{};
  const suffix=opts.suffix||'',duration=opts.duration||900;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){el.textContent=end+suffix;return;}
  const start=performance.now();
  function tick(now){
    const t=Math.min((now-start)/duration,1);
    const eased=1-Math.pow(1-t,3); // ease-out cubic
    el.textContent=Math.round(end*eased)+suffix;
    if(t<1)requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ECG pulse line animation is pure CSS now (.ecg-track keyframe in
// styles.css, GPU-composited transform) — no JS needed to run or to gate
// reduced-motion, since a plain CSS media query handles that directly.

// ═══════════════════════════════════════════════════════════
// ACCOUNT DROPDOWN — shared navbar avatar/name/email popover + logout.
// A page calls renderAcctDropdown(acc) once it has the pah_acc object (same
// place it already populates nav-greet/nav-streak) — this only touches
// elements that exist, so pages without the dropdown markup are unaffected.
// ═══════════════════════════════════════════════════════════
function renderAcctDropdown(acc){
  const trigger=document.getElementById('acct-dd-trigger');
  if(!trigger||!acc)return;
  const nameEl=document.getElementById('acct-dd-name');
  const emailEl=document.getElementById('acct-dd-email');
  if(nameEl)nameEl.textContent=acc.name||'—';
  if(emailEl)emailEl.textContent=acc.email||'No email on file';
  if(acc.photo){
    document.querySelectorAll('.acct-dd-avatar-img').forEach(img=>{img.src=acc.photo;img.style.display='block';});
    document.querySelectorAll('.acct-dd-default-ic').forEach(ic=>{ic.style.display='none';});
  }
}
function toggleAcctDropdown(e){
  if(e)e.stopPropagation();
  const panel=document.getElementById('acct-dd-panel');
  if(panel)panel.classList.toggle('open');
}
document.addEventListener('click',(e)=>{
  const dd=document.getElementById('acct-dd');
  const panel=document.getElementById('acct-dd-panel');
  if(dd&&panel&&panel.classList.contains('open')&&!dd.contains(e.target))panel.classList.remove('open');
});
// account.html defines its own logoutUser() (identical behavior) since it's
// the one page that already needed it before this dropdown existed — that
// later declaration simply wins there, no conflict.
function logoutUser(){
  localStorage.removeItem('pah_acc');
  location.href='exercises.html';
}

// ═══════════════════════════════════════════════════════════
// SERVICE WORKER — registers sw.js (shared here since reveal.js is already
// loaded on every page) so the app installs and its own pages/assets keep
// working offline after a first visit. See sw.js for what genuinely can't be
// made offline-capable (live camera pose tracking, the 3D anatomy embed).
// ═══════════════════════════════════════════════════════════
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{});});
}

// ═══════════════════════════════════════════════════════════
// PAGE LOADER — this is a static multi-page site (no client-side router),
// so every internal link click is a real browser navigation. This shows
// the branded liquid-fill splash (#page-loader) for a minimum time on
// arrival, and re-shows it the instant the user clicks a link to another
// page on this site, so the transition reads as one continuous animation
// bridging the two page loads instead of an abrupt jump/blank flash.
// Usage: initPageLoader() once per page after the markup exists.
// ═══════════════════════════════════════════════════════════
const PAGE_LOADER_LABELS={
  'index.html':'Loading…',
  'exercises.html':'Loading Exercises…',
  'hospitals.html':'Loading Hospitals…',
  'research.html':'Loading Research…',
  'about.html':'Loading About…',
  'account.html':'Loading PhysioSync Account…'
};
function initPageLoader(){
  const overlay=document.getElementById('page-loader');
  if(!overlay)return;
  const subEl=overlay.querySelector('.loader-sub');
  const MIN_MS=550;
  const shownAt=performance.now();
  function hide(){
    const wait=Math.max(0,MIN_MS-(performance.now()-shownAt));
    setTimeout(()=>overlay.classList.add('hide'),wait);
  }
  if(document.readyState==='complete')hide();
  else window.addEventListener('load',hide);

  // Delegated on document, not attached per-link at load time — several
  // links on this site (e.g. index.html's "Related Exercise" link) get
  // their href rewritten dynamically after the page loads, so capturing
  // href once up front (as this used to) meant clicking always navigated
  // to whatever the link pointed to at page-load, not its current target.
  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href*=".html"]');
    if(!a)return;
    const href=a.getAttribute('href');
    if(!href||/^https?:\/\//i.test(href)||a.target==='_blank')return;
    if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button!==0)return; // let open-in-new-tab etc. work normally
    e.preventDefault();
    // Label the destination being navigated TO, not the page being left —
    // showing this page's own "Loading Exercises…" while leaving it for
    // Hospitals was backwards and read as wrong/stale information.
    const file=href.split('?')[0].split('#')[0].split('/').pop();
    if(subEl&&PAGE_LOADER_LABELS[file])subEl.textContent=PAGE_LOADER_LABELS[file];
    overlay.classList.remove('hide');
    setTimeout(()=>{location.href=href;},220);
  });
}
