/* VideoHand semantic composition runtime. MIT. No models or network at render time. */
window.createVideoHandDirector = () => {
  'use strict';
  const P = JSON.parse(document.getElementById('vh-plan').textContent);
  const root = document.getElementById('root');
  const portrait = P.aspect === 'portrait';
  const W = portrait ? 1080 : 1920, H = portrait ? 1920 : 1080;
  const framed = P.presentation?.preset === 'framed';
  const canvas = {scale:framed?.925:1,radius:framed?48:0,background:'#F2F1ED',shadow:framed,...P.presentation?.canvas};
  const presenterStyle = P.presentation?.presenter || {};
  const circle = (presenterStyle.pipShape || (framed?'circle':'rounded')) === 'circle';
  const pipSize = presenterStyle.size?.[P.aspect] || (portrait?272:200);
  const captionTop=Math.min(portrait?1472:700,H-44-pipSize-(portrait?132:108));
  const crop = {x:50,y:framed?10:40,...presenterStyle.cropPosition};
  const tl = gsap.timeline({paused:true});
  // One uniformly scaled surface contains drawings, captions AND the one source video.
  // Framing must never stretch a circle or introduce a second audio-playing element.
  gsap.set('#root',{backgroundColor:canvas.scale<1?canvas.background:P.theme.background});
  gsap.set('#composition-surface',{x:W*(1-canvas.scale)/2,y:H*(1-canvas.scale)/2,scale:canvas.scale,
    borderRadius:canvas.radius,boxShadow:canvas.shadow?'0 24px 80px rgba(43,42,51,.12)':'none'});
  if(P.source) gsap.set('#speaker-video',{objectPosition:`${crop.x}% ${crop.y}%`});
  if (framed) {
    // Reserve a full-width subtitle band ABOVE the largest lower-corner avatar.
    gsap.set('#captions',{left:portrait?58:180,right:portrait?58:180,top:captionTop,bottom:'auto',height:portrait?124:92});
    gsap.set('#end-rule',{opacity:0});
  }
  const nodes = new Map(P.objects.map(o => [o.id, document.getElementById('object-' + o.id)]));
  const motion = id => document.getElementById('motion-' + id);
  const states = new Map(P.objects.map(o => [o.id, {x:0,y:0,scale:1}]));
  const objectById = new Map(P.objects.map(o => [o.id,o]));
  const ownershipEvents = [];
  const slot = (container, index) => {
    const node = nodes.get(container), scale = Number(node.dataset.scale);
    return {x:node.offsetLeft + node.offsetWidth/2 + (index%4-1.5)*78*scale-32*scale,
      y:node.offsetTop + node.offsetHeight/2 + (Math.floor(index/4)-1)*60*scale-24*scale, scale};
  };
  const tween = (id, from, to, at, duration, ease = 'power2.inOut') =>
    tl.fromTo(motion(id), {...from}, {...to, duration, ease, immediateRender:false}, at);

  gsap.set('#world', {x:0,y:0,scale:1});
  for (const object of P.objects) {
    gsap.set(motion(object.id), {opacity:0,x:0,y:0,scale:1,rotation:0});
    if (!object.owner) tween(object.id, {opacity:0,y:12}, {opacity:1,y:0}, object.at, Math.min(.6,P.duration-object.at), 'power2.out');
  }
  let camera = {x:0,y:0,scale:1};
  const loads = new Map();
  for (const action of P.actions) {
    if (action.kind === 'accumulate') {
      const each = Math.min(.48, action.duration / 2), spread = Math.max(0,action.duration-each);
      action.objects.forEach((id,i) => {
        const state = states.get(id);
        tween(id, {...state, y:state.y-30,opacity:0,rotation:-7}, {...state,opacity:1,rotation:0}, action.at + (action.objects.length>1 ? i*spread/(action.objects.length-1) : 0), each, 'power2.out');
      });
    } else if (action.kind === 'transfer') {
      const spread = Math.min(.6, action.duration*.3), travel = action.duration-spread;
      action.objects.forEach((id,i) => {
        const node = nodes.get(id), object = objectById.get(id), from = {...states.get(id)};
        const destination = slot(action.to, object.slot);
        const scale=destination.scale/Number(node.dataset.scale);
        const to = {x:destination.x-node.offsetLeft+(scale-1)*node.offsetWidth/2,y:destination.y-node.offsetTop+(scale-1)*node.offsetHeight/2,scale};
        const at = action.at + (action.objects.length>1 ? i*spread/(action.objects.length-1) : 0);
        const middle = {x:(from.x+to.x)/2, y:(from.y+to.y)/2-(portrait?30:90),scale:(from.scale+to.scale)/2};
        tween(id, {...from,opacity:1}, {...middle,opacity:1}, at, travel/2, 'power1.in');
        tween(id, {...middle,opacity:1}, {...to,opacity:1}, at+travel/2, travel/2, 'power1.out');
        states.set(id,to);
        ownershipEvents.push({id,from:action.from,to:action.to,at:at+travel});
      });
    } else if (action.kind === 'load') {
      const target = document.getElementById('load-' + action.target);
      tl.fromTo(target, {scaleX:loads.get(action.target)||0}, {scaleX:action.amount,duration:action.duration,ease:'power1.inOut',immediateRender:false},action.at);
      loads.set(action.target,action.amount);
    } else if (action.kind === 'focus') {
      let next = {x:0,y:0,scale:1};
      if (action.target) {
        const node = nodes.get(action.target), s = action.scale, state=states.get(action.target);
        next={x:W/2-(node.offsetLeft+node.offsetWidth/2+state.x)*s, y:H*(portrait?.48:.51)-(node.offsetTop+node.offsetHeight/2+state.y)*s,scale:s};
      }
      tl.fromTo('#world',{...camera},{...next,duration:action.duration,ease:'power2.inOut',immediateRender:false},action.at);
      camera=next;
    } else if (action.kind === 'emphasis') {
      tween(action.target,{rotation:0},{rotation:-2},action.at,action.duration/2);
      tween(action.target,{rotation:-2},{rotation:0},action.at+action.duration/2,action.duration/2);
    }
  }

  function presenterBox(mode, corner) {
    if (framed && mode === 'a') return {left:0,top:0,width:W,height:H,opacity:1,borderRadius:0,borderWidth:0,boxShadow:'none'};
    if (framed && mode !== 'a-support') return {left:corner.endsWith('left')?44:W-pipSize-44,
      top:corner.startsWith('top')?(portrait?380:300):H-pipSize-44,width:pipSize,height:pipSize,
      opacity:mode==='b'?0:1,borderRadius:circle?pipSize/2:26,borderWidth:3,boxShadow:'0 8px 24px rgba(43,42,51,.12)'};
    const classicFrame={borderRadius:portrait?26:30,borderWidth:3,boxShadow:'5px 7px 0 rgba(43,42,51,.08)'};
    if (mode === 'a') return {...(portrait ? {left:110,top:440,width:860,height:1080,opacity:1} : {left:495,top:300,width:930,height:560,opacity:1}),...classicFrame};
    if (mode === 'a-support') return {
      ...(portrait ? {left:110,top:1040,width:860,height:570,opacity:1} : {left:1120,top:345,width:630,height:480,opacity:1}),
      ...(framed ? {top:portrait?920:300,height:Math.min(portrait?520:370,captionTop-(portrait?920:300)-24),borderRadius:30,borderWidth:3,boxShadow:'0 8px 24px rgba(43,42,51,.12)'} : classicFrame)};
    if (circle) return {left:corner.endsWith('left')?(portrait?85:140):W-pipSize-(portrait?85:135),
      top:corner.startsWith('top')?(portrait?380:300):(portrait?1360:660),width:pipSize,height:pipSize,opacity:mode==='b'?0:1,borderRadius:pipSize/2};
    const width=portrait?264:330, height=portrait?260:218;
    return {left:corner.endsWith('left')?(portrait?85:140):(W-width-(portrait?85:135)),
      top:corner.startsWith('top')?(portrait?380:300):(portrait?1360:660),width,height,opacity:mode==='b'?0:1,...classicFrame};
  }
  let presenter = presenterBox(P.beats[0].resolvedLayout,P.beats[0].pip);
  gsap.set('#presenter',{...presenter});
  if(!P.source)gsap.set('#speaker-placeholder p, #speaker-placeholder span',{autoAlpha:1});
  // Keep the camera inside world; reserve a separate stage for A-roll support.
  // Shrinking that stage makes room for the speaker without resetting objects.
  const stageBox = mode => mode === 'a-support'
    ? (portrait ? {x:243,y:100,scale:.55,opacity:1} : {x:50,y:220,scale:.52,opacity:1})
    : {x:framed?W*(portrait?.06:.05):0,y:0,scale:framed?(portrait?.88:.9):1,opacity:mode==='a'?0:1};
  let visual = stageBox(P.beats[0].resolvedLayout);
  gsap.set('#visual-stage',{...visual});
  let headingOpacity=framed&&P.beats[0].resolvedLayout==='a'?0:1;
  if(framed)gsap.set('header',{opacity:headingOpacity});
  for (let i=1;i<P.beats.length;i++) {
    const beat=P.beats[i],next=presenterBox(beat.resolvedLayout,beat.pip);
    const nextVisual=stageBox(beat.resolvedLayout);
    const duration=Math.min(.48,(beat.end-beat.start)*.2);
    if (JSON.stringify(next)!==JSON.stringify(presenter)) {
      tl.fromTo('#presenter',{...presenter},{...next,duration,ease:'power2.inOut',immediateRender:false},beat.start);
      // The preview label has no narrative role during a layout morph. Fade it
      // out before it crosses the subtitle band; restore it in the settled frame.
      if(!P.source){
        const fade=Math.min(.08,duration/4), labels='#speaker-placeholder p, #speaker-placeholder span';
        tl.fromTo(labels,{autoAlpha:1},{autoAlpha:0,duration:fade,immediateRender:false},beat.start);
        tl.fromTo(labels,{autoAlpha:0},{autoAlpha:1,duration:fade,immediateRender:false},beat.start+duration);
      }
    }
    if(JSON.stringify(nextVisual)!==JSON.stringify(visual)) tl.fromTo('#visual-stage',{...visual},{...nextVisual,duration,ease:'power1.inOut',immediateRender:false},beat.start);
    if(framed){
      const nextHeading=beat.resolvedLayout==='a'?0:1;
      if(nextHeading!==headingOpacity)tl.fromTo('header',{opacity:headingOpacity},{opacity:nextHeading,duration:Math.min(.2,duration),immediateRender:false},beat.start);
      headingOpacity=nextHeading;
    }
    presenter=next;visual=nextVisual;
  }
  P.captions.forEach((cue,i)=>{
    gsap.set('#caption-'+i,{visibility:cue.start===0?'visible':'hidden',opacity:cue.start===0?1:0});
    if(cue.start>0)tl.set('#caption-'+i,{visibility:'visible',opacity:1},cue.start);
    tl.set('#caption-'+i,{visibility:'hidden',opacity:0},cue.end);
  });
  // Ensure the silent part at the end also belongs to the finite timeline.
  tl.to({clock:0},{clock:P.duration,duration:P.duration,ease:'none'},0);
  window.VideoHandDirector={
    plan:P,
    ownersAt(time){
      const state=Object.fromEntries(P.objects.filter(o=>o.owner).map(o=>[o.id,o.owner]));
      for(const event of ownershipEvents)if(event.at<=time)state[event.id]=event.to;
      return state;
    },
    beatAt(time){return P.beats.find(b=>b.start<=time&&time<b.end)||P.beats.at(-1);}
  };
  // Resolve lazy fromTo start states once before the first paint. In particular,
  // frame zero must match a later reverse seek back to zero.
  tl.totalTime(P.duration,true);
  tl.totalTime(0,true);
  root.dataset.vhReady='true';
  return tl;
};
