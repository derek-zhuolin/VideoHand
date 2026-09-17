/* Starter: one semantic chain. Author new geometry and beats for each story. */
(() => {
  const C=window.FILM_CONFIG, root=document.querySelector('#root');
  const tl=gsap.timeline({paused:true});
  const D=VideoHand.create(root,tl,{duration:C.duration,amplitude:C.boil,id:'doodle-ink'});
  const title=document.querySelector('#title'); title.textContent=C.title; title.style.filter=D.filter;
  document.querySelector('#subtitle').textContent=C.subtitle;
  D.enter('#title',0,{duration:.5});D.enter('#subtitle',.16);
  const scene=document.querySelector('#scene');
  C.nodes.forEach((n,i)=>{
    if(i){
      const link=document.createElement('div');link.className='link';link.id='link-'+i;
      link.append(D.icon(C.aspect==='portrait'?'arrow-down':'arrow-right',{size:66}));scene.append(link);
      D.enter(link,Math.max(0,n.at-.25),{y:0});
    }
    const node=document.createElement('div');node.className='node';node.id='node-'+i;
    node.append(D.icon(n.icon,{size:180}));
    const label=document.createElement('div');label.className='node-label';label.textContent=n.label;label.style.filter=D.filter;
    node.append(label);scene.append(node);
    D.enter(node,n.at,{y:14});D.draw(`#node-${i} path`,n.at,.4,.025);
  });
  C.captions.forEach((cap,i)=>{
    const el=document.createElement('div');el.id='caption-'+i;el.className='caption';
    const line=document.createElement('span');
    if(cap.key && cap.text.includes(cap.key)){
      const at=cap.text.indexOf(cap.key);line.append(cap.text.slice(0,at));
      const mark=document.createElement('mark');mark.textContent=cap.key;line.append(mark,cap.text.slice(at+cap.key.length));
    }else line.textContent=cap.text;
    el.append(line);
    document.querySelector('#captions').append(el);
    tl.set(el,{visibility:'visible'},cap.start);
    tl.fromTo(el,{opacity:0},{opacity:1,duration:.08},cap.start);
    D.exit(el,cap.end-.08,.08);
  });
  window.__timelines=window.__timelines||{};
  window.__timelines['videohand-doodle']=tl;
})();
