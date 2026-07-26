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
