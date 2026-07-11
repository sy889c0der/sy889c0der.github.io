// Forest Engine v2 - Shared across all enhanced pages
// Adds: stars, fog, day/night, bird flocks, rain

const Forest = (() => {
  let canvas, ctx, W, H, groundY;
  const mouse = { x: -1000, y: -1000, vx: 0, vy: 0, px: 0, py: 0 };
  let time = 0, lastMossTime = 0;
  const particles = [], mossClusters = [], stars = [], birds = [], raindrops = [];
  let nightLevel = 0, targetNight = 0;
  let fogParticles = [], mistOffset = 0;
  let grainCanvas, grainCtx;
  let auroraGrads = null;
  
  const TREES = [
    { fx: 0.12, fy: 0, h: 300, w: 20, s: 0 },
    { fx: 0.28, fy: 15, h: 350, w: 24, s: 1 },
    { fx: 0.44, fy: -5, h: 280, w: 18, s: 2 },
    { fx: 0.58, fy: 8, h: 340, w: 22, s: 3 },
    { fx: 0.72, fy: -10, h: 260, w: 16, s: 4 },
    { fx: 0.86, fy: 5, h: 310, w: 20, s: 5 },
    { fx: 0.96, fy: -3, h: 270, w: 15, s: 6 },
  ];

  function init() {
    canvas = document.getElementById('c');
    if (!canvas) { requestAnimationFrame(() => init()); return; }
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('mousemove', e => {
      mouse.px = mouse.x; mouse.py = mouse.y;
      mouse.x = e.clientX; mouse.y = e.clientY;
      mouse.vx = mouse.x - mouse.px;
      mouse.vy = mouse.y - mouse.py;
    });
    
    document.addEventListener('keydown', e => {
      if (e.key === 'n' || e.key === 'N') targetNight = targetNight > 0.5 ? 0 : 1;
      if (e.key === 'r' || e.key === 'R') spawnRain();
    });

    // Dust
    for (let i = 0; i < 30; i++) {
      particles.push({ x: Math.random()*W, y: Math.random()*H, vx: (Math.random()-0.5)*0.3, vy: (Math.random()-0.5)*0.15, size: 0.5+Math.random()*1, life: Math.random()*300, maxLife: 400+Math.random()*500, type: 'dust', phase: Math.random()*Math.PI*2 });
    }
    // Stars
    for (let i = 0; i < 120; i++) {
      stars.push({ x: Math.random()*W, y: Math.random()*H*0.65, size: 0.5+Math.random()*1.5, twinkle: Math.random()*Math.PI*2, speed: 0.5+Math.random()*2 });
    }
    // Birds
    for (let i = 0; i < 3; i++) spawnBirdFlock();
    // Fog
    for (let i = 0; i < 15; i++) {
      fogParticles.push({ x: Math.random()*W, y: groundY - 100 - Math.random()*200, size: 80+Math.random()*200, speed: 0.1+Math.random()*0.3, opacity: 0.02+Math.random()*0.04 });
    }

    // Film grain overlay
    grainCanvas = document.createElement("canvas");
    grainCanvas.width = 128; grainCanvas.height = 128;
    grainCtx = grainCanvas.getContext("2d");
    const grainData = grainCtx.createImageData(128, 128);
    for (let i = 0; i < grainData.data.length; i += 4) {
      const v = Math.random() * 255;
      grainData.data[i] = grainData.data[i+1] = grainData.data[i+2] = v;
      grainData.data[i+3] = 255;
    }
    grainCtx.putImageData(grainData, 0, 0);

        // Aurora gradients
    if (!auroraGrads) {
      auroraGrads = [];
      const auroraDefs = [
        { hue: 160, amp: 42, freq: 0.003, speed: 0.12, bandW: 34 },
        { hue: 225, amp: 52, freq: 0.0025, speed: 0.18, bandW: 38 },
        { hue: 175, amp: 32, freq: 0.0035, speed: 0.09, bandW: 28 },
        { hue: 195, amp: 38, freq: 0.002, speed: 0.22, bandW: 32 },
      ];
      auroraDefs.forEach(def => {
        const ac = document.createElement("canvas");
        ac.width = 1; ac.height = def.bandW * 2;
        const actx = ac.getContext("2d");
        const g = actx.createLinearGradient(0, 0, 0, ac.height);
        const h = def.hue;
        g.addColorStop(0, `hsla(${h},80%,60%,0)`);
        g.addColorStop(0.2, `hsla(${h},80%,55%,0.6)`);
        g.addColorStop(0.5, `hsla(${h},90%,65%,0.9)`);
        g.addColorStop(0.8, `hsla(${h},80%,55%,0.3)`);
        g.addColorStop(1, `hsla(${h},80%,60%,0)`);
        actx.fillStyle = g;
        actx.fillRect(0, 0, 1, ac.height);
        auroraGrads.push({ canvas: ac, def });
      });
    }

    lastMossTime = performance.now() / 1000;
    animate(0);
  }

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    groundY = H * 0.72;
  }

  function spawnBirdFlock() {
    const baseX = -50, baseY = groundY*0.3 + Math.random()*groundY*0.4;
    for (let i = 0; i < 6; i++) {
      birds.push({
        x: baseX + i*15, y: baseY + i*8, vx: 0.8+Math.random()*1.2, vy: Math.sin(i)*1.5,
        size: 3+Math.random()*2, wingPhase: Math.random()*Math.PI*2, wingSpeed: 4+Math.random()*3,
        seed: Math.random()
      });
    }
  }

  function spawnRain() {
    for (let i = 0; i < 120; i++) {
      raindrops.push({
        x: Math.random()*W*1.2, y: Math.random()*-H*0.5,
        vy: 8+Math.random()*12, size: 0.5+Math.random()*1.5,
        life: 3+Math.random()*4
      });
    }
    setTimeout(() => raindrops.length = 0, 5000);
  }

  function drawTree(tree, ti, t) {
    const h = (n) => { const x = Math.sin(n) * 43758.5453; return x - Math.floor(x); };
    const x = tree.fx * W, baseY = groundY + tree.fy;
    const mouseInfluence = Math.max(0, 1 - Math.hypot(mouse.x-x, mouse.y-baseY)/200);
    const extraSway = mouse.vx * mouseInfluence * 0.5;
    const sway = Math.sin(t*0.5 + tree.s)*4.5 + extraSway;
    const topX = x + sway, topY = baseY - tree.h;
    const tw = tree.w * 0.5;
    const flare = tw * 0.55;
    // Canopy sways more than trunk top + dips slightly
    const csway = sway * 2.0;
    const ctopX = x + csway;
    const ctopY = topY + Math.abs(sway) * 0.6;
    // Per-tree natural lean (constant, based on tree index)
    const leanAngle = (h(ti * 137.5 + 73.1) - 0.5) * 0.15;
    ctx.save();
    ctx.translate(x, baseY);
    ctx.rotate(leanAngle);
    ctx.translate(-x, -baseY);

    // === TRUNK: organic bezier silhouette ===
    ctx.fillStyle = '#1a0f05';
    ctx.beginPath();
    ctx.moveTo(x - tw - flare, baseY);
    ctx.bezierCurveTo(x - tw - flare*0.5, baseY - tree.h*0.3, topX - tw*0.4, topY + 30, topX - tw*0.22, topY + 6);
    ctx.lineTo(topX + tw*0.22, topY + 6);
    ctx.bezierCurveTo(topX + tw*0.4, topY + 30, x + tw + flare*0.5, baseY - tree.h*0.3, x + tw + flare, baseY);
    ctx.closePath(); ctx.fill();

    // Main trunk body with side lighting
    const trunkGrad = ctx.createLinearGradient(x - tw - flare, 0, x + tw + flare, 0);
    trunkGrad.addColorStop(0, '#2d1a0e'); trunkGrad.addColorStop(0.25, '#5a3a22');
    trunkGrad.addColorStop(0.45, '#6b4530'); trunkGrad.addColorStop(0.55, '#5c3a25');
    trunkGrad.addColorStop(0.8, '#3a2212'); trunkGrad.addColorStop(1, '#1f1007');
    ctx.fillStyle = trunkGrad;
    ctx.beginPath();
    ctx.moveTo(x - tw - flare*0.65, baseY);
    ctx.bezierCurveTo(x - tw - flare*0.25, baseY - tree.h*0.25, topX - tw*0.35, topY + 18, topX - tw*0.17, topY + 2);
    ctx.lineTo(topX + tw*0.17, topY + 2);
    ctx.bezierCurveTo(topX + tw*0.35, topY + 18, x + tw + flare*0.25, baseY - tree.h*0.25, x + tw + flare*0.65, baseY);
    ctx.closePath(); ctx.fill();

    // Warm highlight strip
    const hl = ctx.createLinearGradient(x - tw*0.1, 0, x + tw*0.25, 0);
    hl.addColorStop(0, 'rgba(120,80,50,0.12)'); hl.addColorStop(0.5, 'rgba(150,105,70,0.22)');
    hl.addColorStop(1, 'rgba(100,65,40,0.05)');
    ctx.fillStyle = hl;
    ctx.beginPath();
    ctx.moveTo(x - 1, baseY);
    ctx.bezierCurveTo(x, baseY - tree.h*0.2, topX, topY + 12, topX - 1.5, topY);
    ctx.lineTo(topX + 3.5, topY);
    ctx.bezierCurveTo(topX + 4, topY + 12, x + 3, baseY - tree.h*0.2, x + 3, baseY);
    ctx.closePath(); ctx.fill();

    // === BARK TEXTURE ===
    ctx.lineCap = 'round';
    for (let b = 0; b < 16; b++) {
      const bx = x - tw*0.45 + (b / 15) * tw * 0.9;
      const wobble = Math.sin(b * 2.3 + ti) * tw * 0.32;
      const life = 0.25 + Math.abs(Math.sin(b * 1.7)) * 0.5;
      ctx.strokeStyle = `rgba(12,6,2,${life * 0.55})`;
      ctx.lineWidth = 0.6 + h(b * 42.7 + ti * 17.3) * 1.4 * life;
      ctx.beginPath();
      const segs = 12;
      for (let s = 0; s <= segs; s++) {
        const sy = baseY - tree.h * (s / segs);
        const swayFrac = s / segs;
        const sx = bx + sway * swayFrac + wobble * Math.sin(s * 0.55 + b) + Math.sin(b * 2.5 + t*0.3 + s)*1.8;
        s === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    // === KNOTS ===
    for (let k = 0; k < 3 + Math.floor(ti*0.4); k++) {
      const ky = baseY - tree.h * (0.12 + k * 0.28);
      const kFrac = 0.12 + k * 0.28;
      const kx = x + sway * kFrac + Math.sin(k*3.5 + ti) * tw * 0.35;
      const kr = 2.5 + Math.abs(Math.sin(k*2.3)) * 5;
      ctx.fillStyle = 'rgba(8,4,1,0.7)';
      ctx.beginPath(); ctx.ellipse(kx, ky, kr, kr*0.7, Math.sin(k)*0.3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(20,10,4,0.45)';
      ctx.beginPath(); ctx.ellipse(kx, ky, kr*0.5, kr*0.35, Math.sin(k)*0.3, 0, Math.PI*2); ctx.fill();
    }

    // === BRANCHES ===
    const bc = 5 + Math.floor(ti * 0.7);
    ctx.lineCap = 'round';
    for (let br = 0; br < bc; br++) {
      const brProgress = (br + 1) / (bc + 1);
      const ba = -Math.PI*0.32 + (br/(bc-1) - 0.5)*1.15 + Math.sin(br + ti)*0.12;
      const bl = 32 + (1 - brProgress) * 75;
      const bs = baseY - tree.h*(0.32 + brProgress*0.52);
      const swMap = sway * 1.3 * (bs - baseY)/(-tree.h);
      const beX = x + swMap + Math.cos(ba)*bl;
      const beY = bs + Math.sin(ba)*bl;
      const bw = 4 - brProgress*3;

      // Branch body
      ctx.strokeStyle = br < 3 ? '#4a2d18' : '#382012';
      ctx.lineWidth = Math.max(0.7, bw);
      ctx.beginPath();
      ctx.moveTo(x + swMap*0.5, bs);
      ctx.bezierCurveTo(x + swMap*0.6 + Math.cos(ba)*bl*0.3, bs + Math.sin(ba)*bl*0.3 - 7,
                        beX - Math.cos(ba)*8, beY + 4, beX, beY);
      ctx.stroke();

      // Sub-branches
      if (br < 3) {
        for (let sb = 0; sb < 2; sb++) {
          const sbP = 0.25 + sb*0.45, sbA = ba + (sb-0.5)*0.65, sbL = bl*0.42;
          const sbX = x + swMap*0.5 + Math.cos(ba)*bl*sbP, sbY = bs + Math.sin(ba)*bl*sbP;
          ctx.strokeStyle = '#3a2010'; ctx.lineWidth = Math.max(0.5, bw*0.55);
          ctx.beginPath(); ctx.moveTo(sbX, sbY);
          ctx.quadraticCurveTo(sbX + Math.cos(sbA)*sbL*0.5, sbY + Math.sin(sbA)*sbL*0.5 - 4,
                               sbX + Math.cos(sbA)*sbL, sbY + Math.sin(sbA)*sbL);
          ctx.stroke();
        }
      }

      // Foliage clusters at branch tips – irregular soft blobs
      if (br > 0) {
        const fc = 3 + br;
        for (let f = 0; f < fc; f++) {
          const foX = beX + Math.cos(f*2.5 + ti)*15 + Math.sin(f*3+br)*5;
          const foY = beY + Math.sin(f*2.5 + ti)*12 - 4 + Math.cos(f*3+br)*5;
          const foR = 14 + Math.sin(f + ti)*8;
          const sides = 6 + f%3;

          // Organic blob vertices
          const bpts = [];
          for (let s = 0; s < sides; s++) {
            const sa = (s/sides)*Math.PI*2 + f*0.8;
            const sr = foR*(0.73 + Math.sin(s*1.6+f)*0.27);
            bpts.push({x:foX+Math.cos(sa)*sr, y:foY+Math.sin(sa)*sr*0.6});
          }

          // Shadow
          ctx.fillStyle = 'rgba(10,32,6,0.5)';
          ctx.beginPath(); ctx.moveTo(bpts[0].x+2, bpts[0].y+2);
          for (let i = 0; i < bpts.length; i++) {
            const n = bpts[(i+1)%bpts.length];
            ctx.quadraticCurveTo((bpts[i].x+n.x)/2 + Math.sin(i)*2, (bpts[i].y+n.y)/2 + Math.cos(i)*2, n.x, n.y);
          }
          ctx.fill();

          // Mid tone
          const mid = ctx.createRadialGradient(foX-2, foY-3, 0, foX, foY, foR*0.75);
          mid.addColorStop(0, 'rgba(48,115,35,0.65)');
          mid.addColorStop(0.5, 'rgba(32,88,25,0.45)');
          mid.addColorStop(1, 'rgba(18,55,14,0)');
          ctx.fillStyle = mid;
          ctx.beginPath(); ctx.moveTo(bpts[0].x, bpts[0].y);
          for (let i = 0; i < bpts.length; i++) {
            const n = bpts[(i+1)%bpts.length];
            ctx.quadraticCurveTo((bpts[i].x+n.x)/2 + Math.sin(i)*2, (bpts[i].y+n.y)/2 + Math.cos(i)*2, n.x, n.y);
          }
          ctx.fill();

          // Highlight
          const hlF = ctx.createRadialGradient(foX-foR*0.25, foY-foR*0.28, 0, foX, foY, foR*0.4);
          hlF.addColorStop(0, 'rgba(85,170,55,0.38)');
          hlF.addColorStop(0.6, 'rgba(55,135,40,0.12)');
          hlF.addColorStop(1, 'rgba(40,100,30,0)');
          ctx.fillStyle = hlF;
          ctx.beginPath(); ctx.ellipse(foX-1, foY-2, foR*0.42, foR*0.28, f*0.5, 0, Math.PI*2); ctx.fill();
        }
      }
    }

        // === MAIN CANOPY: soft, dense, irregular foliage clusters ===
    const cc = 22 + Math.floor(ti*0.8);
    const clusterData = [];
    for (let c = 0; c < cc; c++) {
      const ca = (c/cc)*Math.PI*2 + ti*0.018;
      const cd = 20 + Math.sin(c*1.7)*40 + h(c * 137.5 + ti * 73.1) * 12;
      const coX = ctopX + Math.cos(ca)*cd + (h(c * 251.3 + ti * 89.7) - 0.5) * 10;
      const coY = ctopY - 8 + Math.sin(ca)*cd*0.38 + (h(c * 313.7 + ti * 101.3) - 0.5) * 15;
      const coR = 18 + Math.abs(Math.sin(c*2.3 + ti))*22 + h(c * 419.9 + ti * 113.5) * 10;
      const shade = 0.4 + Math.sin(c*1.3)*0.4;
      clusterData.push({x:coX, y:coY, r:coR, shade, seed:c});
    }

    // Pass 1: drop shadows
    clusterData.forEach(cl => {
      const pts = [], sides = 7 + Math.floor(cl.seed%3);
      for (let s = 0; s < sides; s++) {
        const sa = (s/sides)*Math.PI*2 + cl.seed*0.6;
        const sr = cl.r*(0.68 + Math.sin(s*1.5+cl.seed)*0.32);
        pts.push({x:cl.x+Math.cos(sa)*sr + Math.sin(s*2+cl.seed)*3,
                   y:cl.y+Math.sin(sa)*sr*0.62 + Math.cos(s*2+cl.seed)*2});
      }
      ctx.fillStyle = 'rgba(12,36,8,0.45)';
      ctx.beginPath(); ctx.moveTo(pts[0].x+2, pts[0].y+2);
      for (let i = 0; i < pts.length; i++) {
        const n = pts[(i+1)%pts.length];
        const mx = (pts[i].x+n.x)/2 + Math.sin(i*2.4+cl.seed)*3;
        const my = (pts[i].y+n.y)/2 + Math.cos(i*2.4+cl.seed)*2;
        ctx.quadraticCurveTo(mx, my, n.x, n.y);
      }
      ctx.fill();
    });

    // Pass 2: cluster bodies with rich green gradients
    clusterData.forEach(cl => {
      const pts = [], sides = 7 + Math.floor(cl.seed%3);
      for (let s = 0; s < sides; s++) {
        const sa = (s/sides)*Math.PI*2 + cl.seed*0.6;
        const sr = cl.r*(0.68 + Math.sin(s*1.5+cl.seed)*0.32);
        pts.push({x:cl.x+Math.cos(sa)*sr + Math.sin(s*2+cl.seed)*3,
                   y:cl.y+Math.sin(sa)*sr*0.62 + Math.cos(s*2+cl.seed)*2});
      }
      const shade = cl.shade;
      const r = Math.floor(38 + shade*35), g = Math.floor(105 + shade*38), b = Math.floor(28 + shade*30);
      const cGrad = ctx.createRadialGradient(cl.x-cl.r*0.12, cl.y-cl.r*0.18, 0, cl.x, cl.y, cl.r);
      cGrad.addColorStop(0, `rgba(${r},${g},${b},0.72)`);
      cGrad.addColorStop(0.5, `rgba(${Math.floor(r*0.68)},${Math.floor(g*0.68)},${Math.floor(b*0.68)},0.5)`);
      cGrad.addColorStop(0.8, `rgba(${Math.floor(r*0.4)},${Math.floor(g*0.4)},${Math.floor(b*0.4)},0.2)`);
      cGrad.addColorStop(1, 'rgba(12,40,6,0)');
      ctx.fillStyle = cGrad;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 0; i < pts.length; i++) {
        const n = pts[(i+1)%pts.length];
        const mx = (pts[i].x+n.x)/2 + Math.sin(i*2.4+cl.seed)*3;
        const my = (pts[i].y+n.y)/2 + Math.cos(i*2.4+cl.seed)*2;
        ctx.quadraticCurveTo(mx, my, n.x, n.y);
      }
      ctx.fill();
    });

    // Pass 3: inner bright accents
    clusterData.forEach(cl => {
      if (cl.shade > 0.55) {
        const hR = cl.r*0.55;
        const hGrad = ctx.createRadialGradient(cl.x-hR*0.3, cl.y-hR*0.3, 0, cl.x, cl.y, hR);
        hGrad.addColorStop(0, 'rgba(90,180,55,0.38)');
        hGrad.addColorStop(0.5, 'rgba(65,145,42,0.15)');
        hGrad.addColorStop(1, 'rgba(40,100,30,0)');
        ctx.fillStyle = hGrad;
        ctx.beginPath(); ctx.ellipse(cl.x-2, cl.y-2, hR, hR*0.6, cl.seed*0.3, 0, Math.PI*2); ctx.fill();
      }
    });

    // Pass 4: scattered leaf flecks
    for (let lf = 0; lf < 50; lf++) {
      const lx = ctopX + (h(lf * 37.1 + ti * 53.9) - 0.5) * 120 + Math.sin(lf*1.3+ti)*35;
      const ly = ctopY + (h(lf * 71.3 + ti * 67.5) - 0.5) * 90 + Math.cos(lf*1.7+ti)*25;
      if (ly > ctopY + 40 || ly < ctopY - 70) continue;
      ctx.fillStyle = `rgba(${60+h(lf*103.7+ti*19.3)*50},${120+h(lf*137.9+ti*41.7)*50},${30+h(lf*173.3+ti*83.1)*30},0.4)`;
      ctx.beginPath();
      ctx.arc(lx, ly, 1.2+h(lf*211.5+ti*127.9)*2.5, 0, Math.PI*2);
      ctx.fill();
    }

    // Tiny bright highlight flecks
    for (let lf = 0; lf < 30; lf++) {
      const lx = ctopX + (h(lf * 61.7 + ti * 43.3) - 0.5) * 100;
      const ly = ctopY - 5 + (h(lf * 91.1 + ti * 79.9) - 0.5) * 65;
      if (ly > ctopY + 30 || ly < ctopY - 55) continue;
      ctx.fillStyle = `rgba(${120+h(lf*131.7+ti*23.1)*40},${185+h(lf*167.9+ti*57.3)*40},${55+h(lf*199.3+ti*101.9)*30},0.35)`;
      ctx.beginPath();
      ctx.arc(lx, ly, 0.8+h(lf*239.5+ti*143.7)*1.5, 0, Math.PI*2);
      ctx.fill();
    }

    // === GRASS AT TRUNK BASE ===
    for (let g = 0; g < 28; g++) {
      const gx = x + (g-14)*6.5 + Math.sin(g*0.55)*7;
      const gh = 7 + Math.abs(Math.sin(g + ti))*11;
      const lean = Math.sin(g*1.6 + t*0.35)*5;
      ctx.strokeStyle = `hsl(${92+Math.sin(g*0.7)*28},${42+Math.sin(g*1.2)*18}%,${16+Math.sin(g*0.45)*14}%)`;
      ctx.lineWidth = 0.9 + Math.sin(g*2.2)*0.7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(gx, baseY);
      ctx.bezierCurveTo(gx + lean*0.3, baseY - gh*0.35, gx + lean*0.6 + Math.sin(g+t)*1.5, baseY - gh*0.68, gx + lean + Math.sin(g+t)*2.5, baseY - gh);
      ctx.stroke();
    }
    ctx.restore();
  }

  function addMoss(px, py) {
    const cluster = { particles: [], born: time };
    for (let i = 0; i < 15; i++) {
      const a = Math.random()*Math.PI*2, d = Math.random()*12;
      cluster.particles.push({ x: px+Math.cos(a)*d, y: py+Math.sin(a)*d, size:2+Math.random()*5, color:'hsl('+(95+Math.random()*30)+','+(50+Math.random()*30)+'%,'+(20+Math.random()*20)+'%)', alpha:0.5+Math.random()*0.5 });
    }
    mossClusters.push(cluster);
  }

  function animate(ts) {
    requestAnimationFrame(animate);
    const dt = Math.min((ts - (animate.last||ts))/1000, 0.05);
    animate.last = ts; time += dt; const t = time;

    nightLevel += (targetNight - nightLevel) * 0.01;
    ctx.clearRect(0, 0, W, H);

    // Sky gradient (shifts with night level)
    const skyTop = lerpColor('#1a3a5a', '#0a0a1a', nightLevel);
    const skyMid = lerpColor('#3a6a8a', '#1a2a4a', nightLevel);
    const skyLow = lerpColor('#6aaa8a', '#2a3a4a', nightLevel);
    const skyBot = lerpColor('#8aba7a', '#3a4a3a', nightLevel);
    const sg = ctx.createLinearGradient(0, 0, 0, groundY);
    sg.addColorStop(0, skyTop); sg.addColorStop(0.4, skyMid);
    sg.addColorStop(0.7, skyLow); sg.addColorStop(1, skyBot);
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, groundY+2);

    // === AURORA BOREALIS ===
    if (nightLevel > 0.15 && auroraGrads) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (nightLevel - 0.15) * 1.5) * 0.18;
      ctx.globalCompositeOperation = "lighter";
      auroraGrads.forEach((ag, bi) => {
        const d = ag.def;
        for (let px = 0; px < W; px += 2) {
          const nx = px * d.freq;
          const ny = t * d.speed;
          const noise = Math.sin(nx + ny + bi * 1.7) * d.amp
                      + Math.sin(nx * 2.3 + ny * 0.7 + bi) * d.amp * 0.5
                      + Math.sin(nx * 0.5 + ny * 1.3 + bi * 2.1) * d.amp * 0.25;
          const y = groundY * (0.12 + bi * 0.08) + noise - d.bandW;
          ctx.drawImage(ag.canvas, px, y, 2, d.bandW * 2);
        }
      });
      ctx.restore();
    }

        // === SUN ===
    const sunX = W * 0.72, sunY = groundY * 0.28;
    const sunAlpha = Math.max(0, 1 - nightLevel * 1.6);
    const sunR = 48;
    if (sunAlpha > 0.01) {
      // Wide atmospheric halo
      const halo = ctx.createRadialGradient(sunX, sunY, sunR*0.7, sunX, sunY, sunR*5);
      halo.addColorStop(0, `rgba(255,230,160,${sunAlpha*0.3})`);
      halo.addColorStop(0.25, `rgba(255,210,130,${sunAlpha*0.12})`);
      halo.addColorStop(0.6, `rgba(255,190,110,${sunAlpha*0.03})`);
      halo.addColorStop(1, 'rgba(255,180,100,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(sunX, sunY, sunR*5, 0, Math.PI*2); ctx.fill();

      // Mid glow
      const mid = ctx.createRadialGradient(sunX, sunY, sunR*0.4, sunX, sunY, sunR*2.2);
      mid.addColorStop(0, `rgba(255,248,225,${sunAlpha*0.55})`);
      mid.addColorStop(0.45, `rgba(255,225,165,${sunAlpha*0.2})`);
      mid.addColorStop(1, 'rgba(255,200,140,0)');
      ctx.fillStyle = mid; ctx.beginPath(); ctx.arc(sunX, sunY, sunR*2.2, 0, Math.PI*2); ctx.fill();

      // Sun disc with warm gradient
      const disc = ctx.createRadialGradient(sunX-sunR*0.12, sunY-sunR*0.12, 0, sunX, sunY, sunR);
      disc.addColorStop(0, `rgba(255,255,245,${sunAlpha})`);
      disc.addColorStop(0.3, `rgba(255,248,215,${sunAlpha*0.95})`);
      disc.addColorStop(0.6, `rgba(255,215,145,${sunAlpha*0.75})`);
      disc.addColorStop(0.85, `rgba(255,185,100,${sunAlpha*0.35})`);
      disc.addColorStop(1, `rgba(255,170,90,${sunAlpha*0.08})`);
      ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI*2); ctx.fill();

      // Subtle rays when bright
      if (sunAlpha > 0.25) {
        ctx.save(); ctx.globalAlpha = sunAlpha*0.06; ctx.strokeStyle = '#fffbe6'; ctx.lineWidth = 0.8;
        for (let r = 0; r < 28; r++) {
          const a = (r/28)*Math.PI*2 + t*0.015;
          const iR = sunR*1.08, oR = sunR*(2+Math.sin(r*1.6)*0.55);
          ctx.beginPath(); ctx.moveTo(sunX+Math.cos(a)*iR, sunY+Math.sin(a)*iR);
          ctx.lineTo(sunX+Math.cos(a)*oR, sunY+Math.sin(a)*oR); ctx.stroke();
        }
        ctx.restore();
      }
    }

    // === MOON ===
    const moonX = W * 0.22, moonY = groundY * 0.16;
    const moonAlpha = Math.max(0, Math.min(1, (nightLevel - 0.12)*1.8));
    const moonR = 34;
    if (moonAlpha > 0.01) {
      // Soft lunar halo
      const lunarHalo = ctx.createRadialGradient(moonX, moonY, moonR*0.6, moonX, moonY, moonR*3.5);
      lunarHalo.addColorStop(0, `rgba(200,215,255,${moonAlpha*0.35})`);
      lunarHalo.addColorStop(0.3, `rgba(180,200,250,${moonAlpha*0.12})`);
      lunarHalo.addColorStop(0.7, `rgba(160,185,240,${moonAlpha*0.03})`);
      lunarHalo.addColorStop(1, 'rgba(150,175,230,0)');
      ctx.fillStyle = lunarHalo; ctx.beginPath(); ctx.arc(moonX, moonY, moonR*3.5, 0, Math.PI*2); ctx.fill();

      // Crescent body - cut a circle from another using reverse winding
      ctx.fillStyle = `rgba(238,243,255,${moonAlpha*0.92})`;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI*2);
      ctx.arc(moonX - moonR*0.38, moonY + moonR*0.12, moonR*0.82, 0, Math.PI*2, true);
      ctx.fill();

      // Inner warm highlight on the lit edge
      const moonHL = ctx.createRadialGradient(moonX+moonR*0.25, moonY-moonR*0.2, 0, moonX, moonY, moonR);
      moonHL.addColorStop(0, `rgba(255,255,255,${moonAlpha*0.18})`);
      moonHL.addColorStop(0.5, `rgba(255,255,255,${moonAlpha*0.05})`);
      moonHL.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = moonHL;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI*2);
      ctx.arc(moonX - moonR*0.38, moonY + moonR*0.12, moonR*0.82, 0, Math.PI*2, true);
      ctx.fill();
    }
    
    

    // Stars (visible at night)
    if (nightLevel > 0.1) {
      stars.forEach(s => {
        const twinkle = Math.sin(t*s.speed+s.twinkle)*0.5+0.5;
        const alpha = nightLevel * twinkle * 0.8;
        ctx.fillStyle = `rgba(255,255,240,${alpha})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI*2); ctx.fill();
        // Glow
        if (twinkle > 0.7) {
          const grd = ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.size*3);
          grd.addColorStop(0, `rgba(255,255,240,${alpha*0.5})`);
          grd.addColorStop(1, 'rgba(255,255,240,0)');
          ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(s.x,s.y,s.size*3,0,Math.PI*2); ctx.fill();
        }
      });
    }

    // === VOLUMETRIC GOD RAYS ===
    const grSunAlpha = Math.max(0, 1 - nightLevel * 1.6);
    if (grSunAlpha > 0.04) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = grSunAlpha * 0.07;
      const grX = W * 0.72, grY = groundY * 0.28;
      const grMaxLen = Math.max(W, H) * 1.4;
      const grRays = 36;
      const grConeCenter = Math.PI * 0.35;
      const grConeHalf = Math.PI * 0.32;

      for (let r = 0; r < grRays; r++) {
        const rt = r / grRays;
        const baseA = grConeCenter - grConeHalf + rt * grConeHalf * 2;
        const n1 = Math.sin(r * 137.5 + t * 0.37) * 0.05;
        const n2 = Math.cos(r * 97.3 + t * 0.43) * 0.04;
        const angle = baseA + n1 + n2;
        const spread = 0.004 + Math.abs(Math.sin(r * 3.7 + t * 0.5)) * 0.006;
        const a1 = angle - spread, a2 = angle + spread;

        const grad = ctx.createLinearGradient(grX, grY,
          grX + Math.cos(angle) * grMaxLen, grY + Math.sin(angle) * grMaxLen);
        grad.addColorStop(0, "rgba(255,248,220,0.55)");
        grad.addColorStop(0.12, "rgba(255,230,180,0.22)");
        grad.addColorStop(0.35, "rgba(255,210,150,0.06)");
        grad.addColorStop(0.7, "rgba(255,200,150,0.01)");
        grad.addColorStop(1, "rgba(255,200,150,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(grX, grY);
        ctx.lineTo(grX + Math.cos(a1) * grMaxLen, grY + Math.sin(a1) * grMaxLen);
        ctx.lineTo(grX + Math.cos(a2) * grMaxLen, grY + Math.sin(a2) * grMaxLen);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }


    // Ground
    const gTop = lerpColor('#2a4a1a', '#1a2a14', nightLevel);
    const gMid = lerpColor('#1a3a10', '#0d1a08', nightLevel);
    const gBot = lerpColor('#0d1f08', '#050f04', nightLevel);
    const gg = ctx.createLinearGradient(0, groundY, 0, H);
    gg.addColorStop(0, gTop); gg.addColorStop(0.3, gMid); gg.addColorStop(1, gBot);
    ctx.fillStyle = gg; ctx.fillRect(0, groundY, W, H-groundY);

    // Ground line
    ctx.strokeStyle = '#3a6a2a'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 4) {
      const y = groundY + Math.sin(x*0.008+t*0.1)*5 + Math.sin(x*0.02)*2;
      x===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.stroke();

    // Mist/fog
    mistOffset += dt * 5;
    fogParticles.forEach(fp => {
      const fx = (fp.x + mistOffset*fp.speed) % (W+400) - 200;
      const alpha = fp.opacity * (1-nightLevel*0.5);
      const mg = ctx.createRadialGradient(fx, fp.y, 0, fx, fp.y, fp.size);
      mg.addColorStop(0, `rgba(180,200,180,${alpha})`);
      mg.addColorStop(1, 'rgba(180,200,180,0)');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(fx, fp.y, fp.size, 0, Math.PI*2); ctx.fill();
    });

    // Trees
    TREES.forEach((tree, ti) => drawTree(tree, ti, t));

    // Moss
    for (let i = mossClusters.length-1; i >= 0; i--) {
      const c = mossClusters[i], age = t - c.born;
      if (age > 8) { mossClusters.splice(i,1); continue; }
      const fi = Math.min(1, age/1.5);
      c.particles.forEach(p => { ctx.fillStyle=p.color; ctx.globalAlpha=p.alpha*fi; ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill(); });
    }
    ctx.globalAlpha = 1;

    // Moss growth on mouse
    if (mouse.x>0 && mouse.x<W && mouse.y>groundY-50 && mouse.y<H) {
      if (t - lastMossTime > 0.06) { lastMossTime = t; addMoss(mouse.x, mouse.y); }
    }

    // Particles
    for (let i = particles.length-1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt*60; p.x += p.vx+Math.sin(t+p.phase)*0.2; p.y += p.vy+Math.cos(t*0.5+p.phase)*0.1;
      if (p.x<-20) p.x=W+20; if (p.x>W+20) p.x=-20;
      if (p.y<-20) p.y=H+20; if (p.y>H+20) p.y=-20;
      if (p.life>p.maxLife) { particles.splice(i,1); continue; }
      const lr=p.life/p.maxLife, fa=Math.min(1,lr*5), fo=lr>0.8?(1-lr)*5:1, alpha=fa*fo;
       if (p.type==='dust') {
        ctx.fillStyle=`rgba(200,200,180,${alpha*0.3})`;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
      }
    }

    // Birds
    for (let i = birds.length-1; i >= 0; i--) {
      const b = birds[i];
      b.x += b.vx; b.y += Math.sin(t*b.wingSpeed+b.wingPhase)*0.5;
      if (b.x > W+100) birds.splice(i,1);
      ctx.strokeStyle = `rgba(30,30,30,${0.6+Math.sin(t*b.wingSpeed)*0.3})`;
      ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath();
      const wingFlap = Math.sin(t*b.wingSpeed+b.wingPhase)*b.size;
      ctx.moveTo(b.x-5, b.y); ctx.quadraticCurveTo(b.x-2, b.y-wingFlap, b.x, b.y);
      ctx.quadraticCurveTo(b.x+2, b.y-wingFlap, b.x+5, b.y);
      ctx.stroke();
    }
    if (birds.length < 15 && Math.random()<0.002) spawnBirdFlock();

    // Rain
    for (let i = raindrops.length-1; i >= 0; i--) {
      const r = raindrops[i];
      r.y += r.vy; r.life -= dt;
      if (r.life <= 0 || r.y > H) { raindrops.splice(i,1); continue; }
      ctx.strokeStyle = `rgba(180,200,255,${r.life/4*0.4})`;
      ctx.lineWidth = r.size*0.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x+r.vy*0.2, r.y+10); ctx.stroke();
    }

    // Vignette
    const vg = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H*0.8);
    vg.addColorStop(0, 'transparent'); vg.addColorStop(1, `rgba(0,0,0,${0.4+nightLevel*0.2})`);
    ctx.fillStyle = vg; ctx.fillRect(0,0,W,H);

    // Mouse glow
    if (mouse.x>0 && mouse.x<W && mouse.y>0 && mouse.y<H) {
      const mg = ctx.createRadialGradient(mouse.x,mouse.y,0,mouse.x,mouse.y,60);
      mg.addColorStop(0,'rgba(255,240,200,0.08)'); mg.addColorStop(1,'rgba(255,240,200,0)');
      ctx.fillStyle=mg; ctx.beginPath(); ctx.arc(mouse.x,mouse.y,60,0,Math.PI*2); ctx.fill();
    }
    // Film grain
    ctx.save();
    ctx.globalAlpha = 0.04 + nightLevel * 0.02;
    ctx.globalCompositeOperation = 'overlay';
    const gx = Math.floor(Math.random() * 128);
    const gy = Math.floor(Math.random() * 128);
    ctx.drawImage(grainCanvas, -gx, -gy);
    ctx.drawImage(grainCanvas, 128 - gx, -gy);
    ctx.drawImage(grainCanvas, -gx, 128 - gy);
    ctx.drawImage(grainCanvas, 128 - gx, 128 - gy);
    ctx.restore();
  }

  function lerpColor(a, b, t) {
    const ah = parseInt(a.replace('#',''),16), bh = parseInt(b.replace('#',''),16);
    const ar=(ah>>16)&0xff, ag=(ah>>8)&0xff, ab=ah&0xff;
    const br=(bh>>16)&0xff, bg=(bh>>8)&0xff, bb=bh&0xff;
    const rr=Math.round(ar+(br-ar)*t), rg=Math.round(ag+(bg-ag)*t), rb=Math.round(ab+(bb-ab)*t);
    return '#'+((1<<24)|(rr<<16)|(rg<<8)|rb).toString(16).slice(1);
  }

  return { init, time: () => time, nightLevel: () => nightLevel, spawnRain };
})();

document.addEventListener('DOMContentLoaded', () => Forest.init());

