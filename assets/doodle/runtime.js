/* VideoHand 3 · MIT adapter; original Oreo SVG paths remain unmodified. */
window.VideoHand = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  function create(root, timeline, {duration, id = root.id + '-ink', amplitude = 1.3, fps = 7} = {}) {
    if (!root || !timeline || !Number.isFinite(duration) || duration <= 0) throw new Error('Root, timeline and positive duration required');
    if (!/^[a-zA-Z][\w-]*$/.test(id) || document.getElementById(id)) throw new Error('Boil id must be safe and unique: ' + id);
    if (!Number.isFinite(amplitude) || amplitude < 0 || amplitude > 8 || !Number.isFinite(fps) || fps < 1 || fps > 12) throw new Error('Invalid boil settings');
    const defs = document.createElementNS(NS, 'svg');
    defs.setAttribute('width', '0'); defs.setAttribute('height', '0');
    defs.setAttribute('aria-hidden', 'true'); defs.style.position = 'absolute';
    defs.innerHTML = `<defs><filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="2" seed="1" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="${amplitude}" xChannelSelector="R" yChannelSelector="G"/></filter></defs>`;
    root.prepend(defs);
    const noise = defs.querySelector('feTurbulence'), seeds = [1, 7, 13, 5, 11, 3];
    for (let i = 0; i < Math.ceil(duration * fps); i++) timeline.set(noise, {attr: {seed: seeds[i % seeds.length]}}, i / fps);
    const resolve = target => typeof target === 'string' ? [...root.querySelectorAll(target)] : [target];
    function icon(name, {size = 160, color = 'currentColor', boil = true} = {}) {
      const body = window.DOODLE_ICONS?.[name];
      if (!body) throw new Error('Unknown Doodle icon: ' + name);
      if (!Number.isFinite(size) || size <= 0) throw new Error('Positive icon size required');
      const el = document.createElementNS(NS, 'svg');
      Object.entries({width: size, height: size, viewBox: '0 0 48 48', fill: 'none', stroke: 'currentColor', 'stroke-width': 3.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true'}).forEach(([k,v]) => el.setAttribute(k,v));
      el.style.color = color;
      el.innerHTML = boil ? `<g filter="url(#${id})">${body}</g>` : body;
      return el;
    }
    function draw(target, at, duration = .45, stagger = .035) {
      resolve(target).forEach((p,i) => {
        if (typeof p.getTotalLength !== 'function') throw new Error('draw() needs SVG geometry');
        const length = Math.max(1, p.getTotalLength()) + 1;
        timeline.fromTo(p, {strokeDasharray: length, strokeDashoffset: length}, {strokeDashoffset: 0, duration, ease: 'power1.inOut'}, at + i * stagger);
      });
    }
    function enter(target, at, {duration = .45, y = 16, scale = .97} = {}) {
      timeline.fromTo(resolve(target), {opacity: 0, y, scale}, {opacity: 1, y: 0, scale: 1, duration, ease: 'power2.out'}, at);
    }
    function exit(target, at, duration = .2) {
      timeline.to(resolve(target), {opacity: 0, duration}, at);
      timeline.set(resolve(target), {visibility: 'hidden'}, at + duration);
    }
    return {icon, draw, enter, exit, filter: `url(#${id})`};
  }
  return {create};
})();
