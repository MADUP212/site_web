// Graphiques animés de la présentation : courbes, aires empilées et barres en SVG, dans le style de la présentation GRCP 2026.
// Chaque série apparaît à une étape ; l'étape courante suit les fragments de la diapositive
// (0 = aucun fragment affiché). Données : window.DONNEES (donnees.js, écrit par code/presentation_data.R).
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const COULEURS = { accent: '#1f5fbf', encre: '#111', gris: '#8a8a8a', pale: '#c4c4c4', alerte: '#d9730d', rouge: '#d62828' };
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  // Version anglaise : <html lang="en"> (presentation_en.html). Nombres à l'anglaise et noms des lieux
  // tels que l'IISS les écrit (DONNEES.originaux), sans les retraduire.
  const EN = document.documentElement.lang === 'en';
  // Nombres à la française : virgule décimale, espace des milliers, signe moins typographique.
  // En anglais : point décimal, virgule des milliers.
  const fr = (v, k = 0) => {
    const s = Math.abs(v).toFixed(k).replace('.', EN ? '.' : ',').replace(/\B(?=(\d{3})+(?!\d))/g, EN ? ',' : ' ');
    return (Number(v.toFixed(k)) < 0 ? '−' : '') + s;
  };
  const pct = (v, k = 0) => fr(v, k) + (EN ? '%' : ' %');   // « 4,7 % » ou « 4.7% »
  const tx = (f, e) => EN ? e : f;                               // libellé : français ou anglais
  // Nom affiché : en anglais, le lieu tel que l'IISS l'écrit (DONNEES.originaux) ou le libellé traduit
  const LIBELLES_EN = { 'Autres': 'Others', 'Amériques': 'Americas', 'Entre pays': 'Between countries', 'OTAN': 'NATO',
                        'Sans partenaire': 'No partner', 'avec la mer': 'with sea' };
  const nm = n => EN ? (window.DONNEES.originaux[n] || LIBELLES_EN[n] || n) : n;
  const adoucir = u => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  let compteur = 0;

  // ---- Cadre commun : présidents (pointillés et noms) et graduations -----------------------------------
  function cadre(svg, cfg, X, Y, m, L, H, P) {
    // Présidents : pointillés à chaque changement, noms en haut
    if (cfg.presidents) {
      DONNEES.presidents.forEach((p, i) => {
        const a = Math.max(p.debut - 0.5, cfg.x[0]), b = Math.min(p.fin + 0.5, cfg.x[1]);
        if (b <= a) return;
        if (i > 0 && p.debut - 0.5 > cfg.x[0])
          el('line', { x1: X(p.debut - 0.5), x2: X(p.debut - 0.5), y1: m.h - 30, y2: H - m.b, stroke: '#9a9a9a', 'stroke-width': 1.6, 'stroke-dasharray': '6 6' }, svg);
        if (X(b) - X(a) < 90) return;   // mandat trop court pour son nom (Bush : 2008 seulement)
        el('text', { x: (X(a) + X(b)) / 2, y: m.h - 12, 'text-anchor': 'middle', 'font-size': 24, 'font-weight': 'bold', fill: '#6b6b6b' }, svg).textContent = p.nom;
      });
    }
    for (const t of cfg.yTicks) {   // graduations discrètes, ligne de référence marquée
      const ref = t === cfg.ref;
      el('line', { x1: m.g, x2: L - m.d, y1: Y(t), y2: Y(t), stroke: ref ? '#111' : '#e3e3e3', 'stroke-width': ref ? 1.8 : 1 }, svg);
      el('text', { x: m.g - 14, y: Y(t) + 9, 'text-anchor': 'end', 'font-size': P, fill: '#444' }, svg).textContent = cfg.yFmt(t);
    }
    for (const t of cfg.xTicks)
      el('text', { x: X(t), y: H - 10, 'text-anchor': 'middle', 'font-size': P, fill: '#444' }, svg).textContent = t;
  }

  // ---- Courbes -------------------------------------------------------------------------------------
  // cfg : x, y (bornes), xTicks, yTicks, yFmt, vFmt, ref (ligne de référence), presidents (bool),
  //       series : [{ pts, couleur, nom, etape, epaisseur, marques: [[indice, dy]], etqDy }]
  function courbes(conteneur, cfg) {
    const L = 1168, H = cfg.hauteur || 470, P = 26;
    const m = { g: cfg.margeGauche || 96, d: cfg.margeDroite === undefined ? 250 : cfg.margeDroite, h: cfg.presidents ? 44 : 14, b: 46 };
    const svg = el('svg', { viewBox: `0 0 ${L} ${H}`, role: 'img' }, conteneur);
    const X = v => m.g + (v - cfg.x[0]) / (cfg.x[1] - cfg.x[0]) * (L - m.g - m.d);
    const Y = v => H - m.b - (v - cfg.y[0]) / (cfg.y[1] - cfg.y[0]) * (H - m.h - m.b);
    cadre(svg, cfg, X, Y, m, L, H, P);

    // Séries : un masque rectangulaire s'élargit de gauche à droite pour tracer la courbe.
    const series = cfg.series.map(s => {
      const id = 'masque' + (++compteur), coul = COULEURS[s.couleur] || s.couleur, ep = s.epaisseur || 5;
      const rect = el('rect', { x: m.g - 14, y: 0, width: 0, height: H }, el('clipPath', { id }, svg));
      const g = el('g', { 'clip-path': `url(#${id})` }, svg);
      const ligne = el('polyline', { points: s.pts.map(p => `${X(p[0])},${Y(p[1])}`).join(' '), fill: 'none', stroke: coul, 'stroke-width': ep,
                                     'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'stroke-dasharray': s.tirets || 'none',
                                     style: 'transition: stroke 0.6s, opacity 0.6s' }, g);
      const points = s.pts.map(p => el('circle', { cx: X(p[0]), cy: Y(p[1]), r: ep + 1.2, fill: coul, style: 'transition: fill 0.6s, opacity 0.6s' }, g));
      // Étiquette au bout de la ligne : la dernière valeur en gros, puis le nom de la série.
      const fin = s.pts[s.pts.length - 1], etq = el('g', { opacity: 0, style: 'transition: opacity 0.6s' }, svg);
      const etqTextes = [];
      if (s.nom && s.etqLigne) {   // une ligne : le nom puis la valeur, pour les séries serrées
        const t = el('text', { x: X(fin[0]) + 16, y: Y(fin[1]) + 9 + (s.etqDy || 0), 'font-size': 26, fill: coul,
                                 stroke: '#fff', 'stroke-width': 6, 'paint-order': 'stroke' }, etq);
        el('tspan', {}, t).textContent = nm(s.nom) + '  ';
        el('tspan', { 'font-weight': 'bold' }, t).textContent = cfg.vFmt(fin[1]);
        etqTextes.push(t);
      } else if (s.nom) {
        const y0 = Y(fin[1]) + 12 + (s.etqDy || 0);
        etqTextes.push(el('text', { x: X(fin[0]) + 18, y: y0, 'font-size': 32, 'font-weight': 'bold', fill: coul }, etq));
        etqTextes[0].textContent = cfg.vFmt(fin[1]);
        [].concat(s.nom).forEach((txt, i) => {
          const t = el('text', { x: X(fin[0]) + 18, y: y0 + 27 + i * 25, 'font-size': 24, fill: coul }, etq);
          t.textContent = nm(txt); etqTextes.push(t);
        });
      }
      // Valeurs marquées sur la courbe, à une étape donnée : [indice du point, décalage vertical, étape,
      // décalage horizontal, étape où la marque disparaît (facultatif)]. cfg.renvoi (plusieurs courbes proches) : point rouge et petit trait du
      // chiffre au point, pour qu'on voie à quelle courbe le chiffre renvoie.
      const marques = (s.marques || []).map(([i, dy, etape, dx = 0, fin = Infinity]) => {
        const p = s.pts[i], g2 = el('g', { opacity: 0, style: 'transition: opacity 0.6s' }, svg);
        const px = X(p[0]), py = Y(p[1]);
        if (cfg.renvoi) {
          const yFin = dy < 0 ? py + dy + 8 : py + dy - 32;   // bas du chiffre au-dessus, haut du chiffre en dessous
          el('line', { x1: px, y1: py, x2: px + dx, y2: yFin, stroke: COULEURS.rouge, 'stroke-width': 2.2 }, g2);
        }
        el('circle', { cx: px, cy: py, r: cfg.renvoi ? Math.max(ep + 5, 10) : ep + 5, fill: cfg.renvoi ? COULEURS.rouge : COULEURS.accent, stroke: '#fff', 'stroke-width': 3 }, g2);
        el('text', { x: px + dx, y: py + dy, 'text-anchor': 'middle', 'font-size': 34, 'font-weight': 'bold', fill: COULEURS.accent,
                     stroke: '#fff', 'stroke-width': 7, 'paint-order': 'stroke' }, g2).textContent = cfg.vFmt(p[1]);
        return { g: g2, etape: etape || 0, fin, montre: e => (etape || 0) <= e && e < fin };
      });
      return { etape: s.etape || 0, attenue: s.attenue, coul, rect, ligne, points, etq, etqTextes, marques, visible: false, anim: null };
    });
    const largeur = L - m.d - m.g + 28;

    function regler(etape, animer) {
      for (const s of series) {
        for (const q of s.marques) q.g.setAttribute('opacity', s.visible && q.montre(etape) ? 1 : 0);
        // Série atténuée (grise) à partir d'une étape : on passe la parole à une autre série
        const pale = s.attenue !== undefined && etape >= s.attenue;
        s.ligne.setAttribute('stroke', pale ? COULEURS.pale : s.coul);
        s.points.forEach(c => c.setAttribute('fill', pale ? COULEURS.pale : s.coul));
        s.etqTextes.forEach(t => t.setAttribute('fill', pale ? '#9a9a9a' : s.coul));
        const doit = s.etape <= etape;
        if (doit === s.visible) continue;
        s.visible = doit;
        cancelAnimationFrame(s.anim);
        const fixer = (w, o) => { s.rect.setAttribute('width', w); s.etq.setAttribute('opacity', o); };
        if (!doit) { fixer(0, 0); s.marques.forEach(q => q.g.setAttribute('opacity', 0)); continue; }
        if (!animer) { fixer(largeur, 1); s.marques.forEach(q => q.g.setAttribute('opacity', q.montre(etape) ? 1 : 0)); continue; }
        let t0 = null; const duree = cfg.duree || 1800;
        const pas = t => {
          if (t0 === null) t0 = t;   // l'horloge des images, pas performance.now()
          const u = Math.max(0, Math.min(1, (t - t0) / duree));
          s.rect.setAttribute('width', largeur * adoucir(u));
          if (u < 1) s.anim = requestAnimationFrame(pas);
          else { s.etq.setAttribute('opacity', 1); s.marques.forEach(q => q.g.setAttribute('opacity', q.montre(etape) ? 1 : 0)); }
        };
        s.anim = requestAnimationFrame(pas);
      }
    }
    return { regler };
  }

  // ---- Aires empilées --------------------------------------------------------------------------------
  // Une bande par lieu, du bas vers le haut (ordre de cfg.bandes). Toutes les bandes sont grises ;
  // à chaque étape, celles qu'on commente passent en couleur : accent pour un pays, alerte pour une mer.
  // cfg : x, y, xTicks, yTicks, yFmt, vFmt, presidents, margeGauche, margeDroite,
  //       bandes : [{ nom, mer, pts }], surligner : [[noms à l'étape 0], [noms à l'étape 1], ...]
  // Étiquettes : à droite (nom et valeur de la dernière année), écartées pour ne pas se chevaucher ;
  // une bande à 0 la dernière année est nommée au-dessus de la pile, à son année de pointe.
  function aires(conteneur, cfg) {
    const L = 1168, H = cfg.hauteur || 470, P = 26;
    const m = { g: cfg.margeGauche || 130, d: cfg.margeDroite || 300, h: cfg.presidents ? 44 : 14, b: 46 };
    const svg = el('svg', { viewBox: `0 0 ${L} ${H}`, role: 'img' }, conteneur);
    const X = v => m.g + (v - cfg.x[0]) / (cfg.x[1] - cfg.x[0]) * (L - m.d - m.g);
    const Y = v => H - m.b - (v - cfg.y[0]) / (cfg.y[1] - cfg.y[0]) * (H - m.h - m.b);
    cadre(svg, cfg, X, Y, m, L, H, P);

    // Cumuls : bas et haut de chaque bande, année par année
    const annees = cfg.bandes[0].pts.map(p => p[0]);
    const bas = annees.map(() => 0);
    const bandes = cfg.bandes.map(b => {
      const b0 = bas.slice(), b1 = b.pts.map((p, i) => (bas[i] += p[1]));
      return { ...b, b0, b1 };
    });

    const id = 'masque' + (++compteur);
    const rect = el('rect', { x: m.g - 4, y: 0, width: 0, height: H }, el('clipPath', { id }, svg));
    const g = el('g', { 'clip-path': `url(#${id})` }, svg);
    const fondPays = '#cfcfcf', fondAutres = '#e4e4e4', fondMer = '#f3d2b3';
    for (const b of bandes) {
      const haut = annees.map((a, i) => `${X(a)},${Y(b.b1[i])}`), bas_ = annees.map((a, i) => `${X(a)},${Y(b.b0[i])}`).reverse();
      b.fond = b.nom === 'Autres' ? fondAutres : b.mer ? fondMer : fondPays;
      b.vive = b.mer ? COULEURS.alerte : COULEURS.accent;
      b.forme = el('polygon', { points: haut.concat(bas_).join(' '), fill: b.fond, stroke: '#fff', 'stroke-width': 2.5,
                                'stroke-linejoin': 'round', style: 'transition: fill 0.6s' }, g);
    }
    // Total : le haut de la pile, en trait d'encre
    el('polyline', { points: annees.map((a, i) => `${X(a)},${Y(bas[i])}`).join(' '), fill: 'none', stroke: COULEURS.encre,
                     'stroke-width': 3, 'stroke-linejoin': 'round' }, g);

    // Étiquettes à droite : position voulue = milieu de la bande ; on écarte de 27 px au moins,
    // de haut en bas, puis on remonte si la dernière dépasse le bas du graphique.
    const n = annees.length - 1, etq = el('g', { opacity: 0, style: 'transition: opacity 0.6s' }, svg);
    const droite = bandes.filter(b => b.pts[n][1] > 0).map(b => ({ b, voulu: Y((b.b0[n] + b.b1[n]) / 2) }))
      .sort((p, q) => p.voulu - q.voulu);
    const ecart = 27;
    droite.forEach((e, i) => { e.y = i ? Math.max(e.voulu, droite[i - 1].y + ecart) : e.voulu; });
    for (let i = droite.length - 1; i >= 0; i--) {
      const max = i === droite.length - 1 ? H - m.b - 4 : droite[i + 1].y - ecart;
      droite[i].y = Math.min(droite[i].y, max);
    }
    const xEtq = X(annees[n]) + 44;
    for (const e of droite) {
      el('polyline', { points: `${X(annees[n]) + 4},${e.voulu} ${xEtq - 18},${e.voulu} ${xEtq - 6},${e.y}`, fill: 'none',
                       stroke: '#9a9a9a', 'stroke-width': 1.4 }, etq);
      const t = el('text', { x: xEtq, y: e.y + 8, 'font-size': 23, fill: COULEURS.gris, style: 'transition: fill 0.6s' }, etq);
      el('tspan', {}, t).textContent = nm(e.b.nom) + '  ';
      el('tspan', { 'font-weight': 'bold' }, t).textContent = cfg.vFmt(e.b.pts[n][1]);
      e.b.textes = [t];
    }
    // Bandes à 0 la dernière année (une mer quittée) : nom et valeur au-dessus de la pile, à l'année
    // de pointe, avec un trait jusqu'au milieu de la bande. Prévoir de la place en haut (cfg.y).
    for (const b of bandes.filter(b => b.pts[n][1] === 0 && b.pts.some(p => p[1] > 0))) {
      const k = b.pts.reduce((best, p, i) => p[1] > b.pts[best][1] ? i : best, 0);
      const x = X(annees[k]), yHaut = Y(bas[k]);
      el('line', { x1: x, x2: x, y1: yHaut - 10, y2: Y((b.b0[k] + b.b1[k]) / 2), stroke: '#555', 'stroke-width': 1.4 }, etq);
      const t1 = el('text', { x, y: yHaut - 40, 'text-anchor': 'middle', 'font-size': 22, fill: COULEURS.gris }, etq);
      const t2 = el('text', { x, y: yHaut - 16, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 'bold', fill: COULEURS.gris }, etq);
      t1.textContent = nm(b.nom); t2.textContent = cfg.vFmt(b.pts[k][1]);
      b.textes = [t1, t2];
    }

    let visible = false, anim = null;
    const largeur = L - m.d - m.g + 8;
    function regler(etape, animer) {
      const vives = etape >= 0 ? (cfg.surligner[Math.min(etape, cfg.surligner.length - 1)] || []) : [];
      for (const b of bandes) {
        const vive = vives.includes(b.nom);
        b.forme.setAttribute('fill', vive ? b.vive : b.fond);
        (b.textes || []).forEach(t => t.setAttribute('fill', vive ? b.vive : COULEURS.gris));
      }
      const doit = etape >= 0;
      if (doit === visible) return;
      visible = doit;
      cancelAnimationFrame(anim);
      if (!doit) { rect.setAttribute('width', 0); etq.setAttribute('opacity', 0); return; }
      if (!animer) { rect.setAttribute('width', largeur); etq.setAttribute('opacity', 1); return; }
      let t0 = null; const duree = cfg.duree || 1800;
      const pas = t => {
        if (t0 === null) t0 = t;
        const u = Math.max(0, Math.min(1, (t - t0) / duree));
        rect.setAttribute('width', largeur * adoucir(u));
        if (u < 1) anim = requestAnimationFrame(pas); else etq.setAttribute('opacity', 1);
      };
      anim = requestAnimationFrame(pas);
    }
    return { regler };
  }

  // ---- Barres horizontales ---------------------------------------------------------------------------
  // Une barre par catégorie, de haut en bas (ordre de cfg.barres), nom à gauche, valeur au bout.
  // Toutes les barres sont grises ; à chaque étape, celles qu'on commente passent en accent.
  // cfg : max (bout de l'échelle), vFmt, margeGauche, hauteur,
  //       barres : [{ nom, valeur }], surligner : [[noms à l'étape 0], [noms à l'étape 1], ...]
  function barres(conteneur, cfg) {
    const L = 1168, H = cfg.hauteur || 470;
    const m = { g: cfg.margeGauche || 200, d: 110, h: 6, b: 6 };
    const svg = el('svg', { viewBox: `0 0 ${L} ${H}`, role: 'img' }, conteneur);
    const X = v => m.g + v / cfg.max * (L - m.g - m.d);
    const rang = (H - m.h - m.b) / cfg.barres.length, ep = Math.min(rang * 0.64, 46), P = rang > 44 ? 28 : 24;

    const id = 'masque' + (++compteur);
    const rect = el('rect', { x: m.g - 2, y: 0, width: 0, height: H }, el('clipPath', { id }, svg));
    const g = el('g', { 'clip-path': `url(#${id})` }, svg);
    const etq = el('g', { opacity: 0, style: 'transition: opacity 0.6s' }, svg);
    const items = cfg.barres.map((b, i) => {
      const yc = m.h + rang * (i + 0.5), x1 = X(b.valeur), r = 4, y0 = yc - ep / 2;
      // bout arrondi à droite, base droite sur l'axe
      const forme = el('path', { d: `M${m.g},${y0} H${x1 - r} Q${x1},${y0} ${x1},${y0 + r} V${y0 + ep - r} Q${x1},${y0 + ep} ${x1 - r},${y0 + ep} H${m.g} Z`,
                                 fill: '#cfcfcf', style: 'transition: fill 0.6s' }, g);
      const nom = el('text', { x: m.g - 14, y: yc + P * 0.34, 'text-anchor': 'end', 'font-size': P, fill: '#444', style: 'transition: fill 0.6s' }, svg);
      nom.textContent = nm(b.nom);
      const val = el('text', { x: x1 + 10, y: yc + P * 0.34, 'font-size': P, 'font-weight': 'bold', fill: COULEURS.gris, style: 'transition: fill 0.6s' }, etq);
      val.textContent = (cfg.vFmt || fr)(b.valeur);
      return { b, forme, nom, val };
    });
    el('line', { x1: m.g, x2: m.g, y1: m.h, y2: H - m.b, stroke: COULEURS.encre, 'stroke-width': 1.8 }, svg);

    let visible = false, anim = null;
    const largeur = L - m.g + 4;
    function regler(etape, animer) {
      const vives = etape >= 0 ? (cfg.surligner[Math.min(etape, cfg.surligner.length - 1)] || []) : [];
      for (const it of items) {
        const vive = vives.includes(it.b.nom);
        it.forme.setAttribute('fill', vive ? COULEURS.accent : '#cfcfcf');
        it.val.setAttribute('fill', vive ? COULEURS.accent : COULEURS.gris);
        it.nom.setAttribute('fill', vive ? COULEURS.accent : '#444');
      }
      const doit = etape >= 0;
      if (doit === visible) return;
      visible = doit;
      cancelAnimationFrame(anim);
      if (!doit) { rect.setAttribute('width', 0); etq.setAttribute('opacity', 0); return; }
      if (!animer) { rect.setAttribute('width', largeur); etq.setAttribute('opacity', 1); return; }
      let t0 = null; const duree = cfg.duree || 1400;
      const pas = t => {
        if (t0 === null) t0 = t;
        const u = Math.max(0, Math.min(1, (t - t0) / duree));
        rect.setAttribute('width', largeur * adoucir(u));
        if (u < 1) anim = requestAnimationFrame(pas); else etq.setAttribute('opacity', 1);
      };
      anim = requestAnimationFrame(pas);
    }
    return { regler };
  }

  // ---- Grille : une ligne par catégorie, une colonne par année ----------------------------------------
  // Cercle d'aire proportionnelle à la valeur, valeur à droite du cercle ; tiret pour 0. Lignes au repos
  // en gris ; à chaque étape, celles qu'on commente passent en couleur (cfg.couleur : alerte par défaut,
  // pour les mers). cfg : lignes : [{ nom, groupe, pts }], annees, surligner, margeGauche
  function grille(conteneur, cfg) {
    const L = 1168, H = cfg.hauteur || 470, coul = COULEURS[cfg.couleur || 'alerte'];
    const m = { g: cfg.margeGauche || 330, d: 10, h: 44, b: 6 };
    const svg = el('svg', { viewBox: `0 0 ${L} ${H}`, role: 'img' }, conteneur);
    const n = cfg.lignes.length, rang = (H - m.h - m.b) / n, col = (L - m.g - m.d) / cfg.annees.length;
    const max = Math.max(...cfg.lignes.flatMap(l => l.pts.map(p => p[1])));
    const R = Math.min(rang * 0.46, col * 0.24);
    cfg.annees.forEach((a, j) =>
      el('text', { x: m.g + col * (j + 0.5), y: 28, 'text-anchor': 'middle', 'font-size': 24, fill: '#444' }, svg).textContent = a);
    const g = el('g', { opacity: 0 }, svg);
    let groupe = null;
    const lignes = cfg.lignes.map((l, i) => {
      const y = m.h + rang * (i + 0.5);
      if (l.groupe !== groupe && i > 0)   // filet entre deux commandements
        el('line', { x1: 0, x2: L - m.d, y1: m.h + rang * i, y2: m.h + rang * i, stroke: '#e3e3e3', 'stroke-width': 1.2 }, svg);
      const nom = el('text', { x: 0, y: y + 2, 'font-size': 24, fill: '#444', style: 'transition: fill 0.6s' }, svg);
      nom.textContent = nm(l.nom);
      if (l.groupe !== groupe)
        el('text', { x: 0, y: y + 24, 'font-size': 17, fill: COULEURS.gris }, svg).textContent = l.groupe;
      groupe = l.groupe;
      const formes = [], textes = [];
      l.pts.forEach(([a, v], j) => {
        const cx = m.g + col * j + col * 0.32;
        if (v <= 0) { el('line', { x1: cx - 8, x2: cx + 8, y1: y, y2: y, stroke: '#c4c4c4', 'stroke-width': 2 }, g); return; }
        const r = Math.max(Math.sqrt(v / max) * R, 3.5);
        formes.push(el('circle', { cx, cy: y, r, fill: '#c4c4c4', style: 'transition: fill 0.6s' }, g));
        const t = el('text', { x: cx + R + 4, y: y + 7, 'font-size': 20, fill: COULEURS.gris, style: 'transition: fill 0.6s' }, g);
        t.textContent = (cfg.vFmt || fr)(v); textes.push(t);
      });
      return { nom: l.nom, etq: nom, formes, textes };
    });
    let visible = false;
    function regler(etape, animer) {
      const vives = etape >= 0 ? (cfg.surligner[Math.min(etape, cfg.surligner.length - 1)] || []) : [];
      for (const l of lignes) {
        const vive = vives.includes(l.nom);
        l.formes.forEach(c => c.setAttribute('fill', vive ? coul : '#c4c4c4'));
        l.textes.forEach(t => { t.setAttribute('fill', vive ? coul : COULEURS.gris); t.setAttribute('font-weight', vive ? 'bold' : 'normal'); });
        l.etq.setAttribute('fill', vive ? coul : '#444');
      }
      const doit = etape >= 0;
      if (doit === visible) return;
      visible = doit;
      g.style.transition = animer ? 'opacity 0.9s' : 'none';
      g.setAttribute('opacity', doit ? 1 : 0);
    }
    return { regler };
  }

  // ---- Carte des commandements ----------------------------------------------------------------------
  // Fond : window.CARTE (carte.js, écrit par code/presentation_map.R). Pays en gris, contour de chaque
  // commandement en gris foncé, nom au centre ; à chaque étape, les commandements qu'on commente passent
  // en accent. cfg : surligner : [[noms à l'étape 0], [noms à l'étape 1], ...]
  function carte(conteneur, cfg) {
    const L = 1168, H = 470, C = window.CARTE;
    const svg = el('svg', { viewBox: `0 0 ${L} ${H}`, role: 'img' }, conteneur);
    const g = el('g', { opacity: 0, style: 'transition: opacity 0.9s' }, svg);
    el('path', { d: C.non_codes, fill: '#eeeeee', stroke: '#fff', 'stroke-width': 0.6 }, g);
    const fonds = {};
    for (const nom in C.commandements)
      fonds[nom] = el('path', { d: C.commandements[nom], fill: '#d2d2d2', stroke: '#fff', 'stroke-width': 0.6,
                                'stroke-linejoin': 'round', style: 'transition: fill 0.6s' }, g);
    for (const nom in C.contours)
      el('path', { d: C.contours[nom], fill: 'none', stroke: '#6b6b6b', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, g);
    for (const nom in C.etiquettes) {
      const [x, y] = C.etiquettes[nom];
      el('text', { x, y: y + 9, 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 'bold', fill: COULEURS.encre,
                   stroke: '#fff', 'stroke-width': 6, 'paint-order': 'stroke' }, g).textContent = nom;
    }
    let visible = false;
    function regler(etape, animer) {
      const vives = etape >= 0 ? (cfg.surligner[Math.min(etape, cfg.surligner.length - 1)] || []) : [];
      for (const nom in fonds) fonds[nom].setAttribute('fill', vives.includes(nom) ? COULEURS.accent : '#d2d2d2');
      const doit = etape >= 0;
      if (doit === visible) return;
      visible = doit;
      g.style.transition = animer ? 'opacity 0.9s' : 'none';
      g.setAttribute('opacity', doit ? 1 : 0);
    }
    return { regler };
  }

  // ---- Configuration des graphiques -----------------------------------------------------------------
  const D = () => window.DONNEES;
  const CONFIGS = {
    // Figure 2 du journal : budget de défense en % du PIB
    budget: () => ({
      type: courbes, presidents: true, x: [2007.5, 2026.5], y: [0, 6],
      xTicks: [2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024, 2026], yTicks: [0, 2, 4, 6], ref: 0,
      yFmt: v => pct(v), vFmt: v => pct(v, 1), margeDroite: 150,
      series: [{ pts: D().budget, couleur: 'encre', etape: 0, marques: [[0, -24, 1], [18, 52, 2]] }]
    }),
    // Figure 7 : militaires déployés à l'étranger (milliers), avec et sans les marins en mer
    troupes: () => ({
      type: courbes, presidents: true, x: [2013.5, 2026.5], y: [0, 300],
      xTicks: [2014, 2016, 2018, 2020, 2022, 2024, 2026], yTicks: [0, 100, 200, 300], ref: 0,
      yFmt: v => fr(v * 1000), vFmt: v => fr(Math.round(v) * 1000), margeGauche: 120, margeDroite: 230,
      series: [
        { pts: D().troupes, couleur: 'encre', nom: tx('au total', 'total'), etape: 0, attenue: 1, etqDy: -24 },
        { pts: D().troupes_terre, couleur: 'accent', nom: [tx('hors mer', 'excluding sea')], etape: 1, etqDy: 26,
          marques: [[0, -26, 2]] }
      ]
    }),
    // Figure 9 : les cinq principaux théâtres, en % des troupes
    theatres: () => ({
      type: courbes, presidents: true, x: [2013.5, 2026.5], y: [0, 30],
      xTicks: [2014, 2016, 2018, 2020, 2022, 2024, 2026], yTicks: [0, 10, 20, 30], ref: 0,
      yFmt: v => pct(v), vFmt: v => pct(v), margeDroite: 290,
      series: [
        { pts: D().theatres['Japon'], couleur: 'accent', nom: nm('Japon'), etqLigne: true, etape: 0 },
        { pts: D().theatres['Allemagne'], couleur: 'accent', nom: nm('Allemagne'), etqLigne: true, etape: 0 },
        { pts: D().theatres['Corée du Sud'], couleur: 'accent', nom: nm('Corée du Sud'), etqLigne: true, etape: 0 },
        { pts: D().theatres['Koweït'], couleur: 'gris', nom: nm('Koweït'), etqLigne: true, etape: 1, etqDy: 12 },
        { pts: D().theatres['Italie'], couleur: 'gris', nom: nm('Italie'), etqLigne: true, etape: 1, etqDy: -12 }
      ]
    }),
    // Figure 10 : les régions, en % des troupes
    regions: () => ({
      type: courbes, presidents: true, x: [2013.5, 2026.5], y: [0, 60],
      xTicks: [2014, 2016, 2018, 2020, 2022, 2024, 2026], yTicks: [0, 20, 40, 60], ref: 0,
      yFmt: v => pct(v), vFmt: v => pct(v), margeDroite: 270,
      series: [
        { pts: D().regions['Asie'], couleur: 'accent', nom: nm('Asie'), etape: 0, etqDy: -22, marques: [[0, -24, 0]] },
        { pts: D().regions['Europe'], couleur: 'encre', nom: nm('Europe'), etape: 1, etqDy: 22 },
        { pts: D().regions['Moyen-Orient'], couleur: 'gris', nom: tx('Moyen-Orient', ['Middle East', 'and North Africa']), etape: 2, etqDy: tx(-12, -34) },
        { pts: D().regions['En mer'], couleur: 'alerte', nom: nm('En mer'), etape: 3, tirets: '10 9', etqDy: 14 }
      ]
    }),
    // Figure 12 : écart avec 2014, six destinations
    ecarts: () => ({
      type: courbes, presidents: true, x: [2013.5, 2026.5], y: [-30000, 20000],
      xTicks: [2014, 2016, 2018, 2020, 2022, 2024, 2026], yTicks: [-30000, -20000, -10000, 0, 10000, 20000], ref: 0,
      yFmt: v => (v > 0 ? '+' : '') + fr(v), vFmt: v => (v > 0 ? '+' : '') + fr(v), margeGauche: 130, margeDroite: 270,
      series: [
        { pts: D().ecarts['Afghanistan'], couleur: 'accent', nom: nm('Afghanistan'), etqLigne: true, etape: 0, attenue: 2 },
        { pts: D().ecarts['Pologne'], couleur: 'accent', nom: nm('Pologne'), etqLigne: true, etape: 1, attenue: 2 },
        { pts: D().ecarts['Japon'], couleur: 'encre', nom: nm('Japon'), etqLigne: true, etape: 2, etqDy: -6 },
        { pts: D().ecarts['Roumanie'], couleur: 'encre', nom: nm('Roumanie'), etqLigne: true, etape: 2, etqDy: 12 },
        { pts: D().ecarts['Jordanie'], couleur: 'encre', nom: nm('Jordanie'), etqLigne: true, etape: 2, etqDy: 34 },
        { pts: D().ecarts['Koweït'], couleur: 'gris', nom: nm('Koweït'), etqLigne: true, etape: 2, etqDy: 18 }
      ]
    }),

    // ---- Présentation cocom.html : INDOPACOM et EUCOM (code/us_deployments_cocom.R) ----------------------
    // Budget de défense en milliards de dollars constants de 2025
    budget_constant: () => ({
      type: courbes, presidents: true, x: [2007.5, 2026.5], y: [0, 1500],
      xTicks: [2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024, 2026], yTicks: [0, 500, 1000, 1500], ref: 0,
      yFmt: v => fr(v), vFmt: v => fr(v), margeGauche: 110, margeDroite: 150,
      series: [{ pts: D().budget_constant, couleur: 'encre', etape: 0,
                 marques: [[0, -24, 1], [7, 52, 2], [17, -24, 3], [18, 52, 3]] }]
    }),
    // Carte des six commandements (codebook/us_cocom.qmd)
    carte_cocom: () => ({ type: carte, surligner: [[], ['INDOPACOM'], ['EUCOM']] }),
    // Les six commandements, sur terre, 2014-2025 (Amériques = NORTHCOM + SOUTHCOM)
    six_terre: () => ({
      type: courbes, presidents: true, x: [2013.5, 2025.5], y: [0, 120000],
      xTicks: [2014, 2016, 2018, 2020, 2022, 2024], yTicks: [0, 30000, 60000, 90000, 120000], ref: 0,
      yFmt: v => fr(v), vFmt: v => fr(Math.round(v / 100) * 100), margeGauche: 130, margeDroite: 300, renvoi: true,
      series: [
        { pts: D().cocom.six_terre.INDOPACOM, couleur: 'accent', nom: 'INDOPACOM', etqLigne: true, etape: 0, etqDy: -8 },
        { pts: D().cocom.six_terre.EUCOM, couleur: 'encre', nom: 'EUCOM', etqLigne: true, etape: 0, etqDy: 10 },
        { pts: D().cocom.six_terre.CENTCOM, couleur: 'gris', nom: 'CENTCOM', etqLigne: true, etape: 1,
          marques: [[0, 100, 1, 40], [11, 64, 1, -40]] },
        { pts: D().cocom.six_terre.AFRICOM, couleur: 'gris', nom: 'AFRICOM', etqLigne: true, etape: 2, epaisseur: 3, etqDy: -22 },
        { pts: D().cocom.six_terre.AMERIQUES, couleur: 'gris', nom: 'Amériques', etqLigne: true, etape: 2, epaisseur: 3, etqDy: -4 }
      ]
    }),
    // Les six commandements, 2021-2025 : traits pleins = sur terre ; tirets = sur terre et en mer
    six_mer: () => {
      const T = D().cocom.six_terre, M = D().cocom.six_mer, depuis2021 = pts => pts.filter(p => p[0] >= 2021);
      return {
        type: courbes, presidents: true, x: [2020.5, 2025.5], y: [0, 120000],
        xTicks: [2021, 2022, 2023, 2024, 2025], yTicks: [0, 30000, 60000, 90000, 120000], ref: 0,
        yFmt: v => fr(v), vFmt: v => fr(Math.round(v / 100) * 100), margeGauche: 130, margeDroite: 300, renvoi: true,
        series: [
          { pts: depuis2021(T.INDOPACOM), couleur: 'accent', nom: 'INDOPACOM', etqLigne: true, etape: 0, etqDy: 4 },
          { pts: depuis2021(T.EUCOM), couleur: 'encre', nom: 'EUCOM', etqLigne: true, etape: 0, etqDy: 10 },
          { pts: depuis2021(T.CENTCOM), couleur: 'gris', nom: 'CENTCOM', etqLigne: true, etape: 0 },
          { pts: depuis2021(T.AFRICOM), couleur: 'gris', nom: 'AFRICOM', etqLigne: true, etape: 0, epaisseur: 3, etqDy: -22 },
          { pts: depuis2021(T.AMERIQUES), couleur: 'gris', nom: 'Amériques', etqLigne: true, etape: 0, epaisseur: 3, etqDy: -4 },
          { pts: M.INDOPACOM, couleur: 'accent', nom: 'avec la mer', etqLigne: true, etape: 1, epaisseur: 3, tirets: '10 8', etqDy: -10 },
          { pts: M.EUCOM, couleur: 'encre', etape: 1, epaisseur: 3, tirets: '10 8' },
          { pts: M.CENTCOM, couleur: 'gris', etape: 2, epaisseur: 3, tirets: '10 8', marques: [[2, -40, 2]] },
          { pts: M.AMERIQUES, couleur: 'gris', nom: 'avec la mer', etqLigne: true, etape: 3, epaisseur: 3, tirets: '10 8',
            etqDy: -23, marques: [[4, -30, 3, -60]] }
        ]
      };
    },
    // Exercices commencés dans l'année, par commandement du lieu, 2014-2025 (2026 incomplet)
    exercices: () => ({
      type: aires, presidents: true, x: [2013.5, 2025.5], y: [0, 160],
      xTicks: [2014, 2016, 2018, 2020, 2022, 2024], yTicks: [0, 40, 80, 120, 160],
      yFmt: v => fr(v), vFmt: v => fr(v), margeGauche: 100, bandes: D().cocom.exercices,
      surligner: [['EUCOM'], ['INDOPACOM'], []]
    }),
    // Exercices par année : INDOPACOM et EUCOM (séries de la diapositive précédente)
    exercices_asie_europe: () => {
      const d = nom => D().cocom.exercices.find(b => b.nom === nom).pts;
      return {
        type: courbes, presidents: true, x: [2013.5, 2025.5], y: [0, 80],
        xTicks: [2014, 2016, 2018, 2020, 2022, 2024], yTicks: [0, 20, 40, 60, 80], ref: 0,
        yFmt: v => fr(v), vFmt: v => fr(v), margeGauche: 100, margeDroite: 260, renvoi: true,
        series: [
          { pts: d('EUCOM'), couleur: 'encre', nom: 'EUCOM', etqLigne: true, etape: 0, marques: [[9, -34, 0, 0, 1]] },
          { pts: d('INDOPACOM'), couleur: 'accent', nom: 'INDOPACOM', etqLigne: true, etape: 1 }
        ]
      };
    },
    // Jours d'exercice par année : INDOPACOM et EUCOM
    exercices_jours: () => {
      const d = D().cocom.exercices_jours;
      return {
        type: courbes, presidents: true, x: [2013.5, 2025.5], y: [0, 1200],
        xTicks: [2014, 2016, 2018, 2020, 2022, 2024], yTicks: [0, 300, 600, 900, 1200], ref: 0,
        yFmt: v => fr(v), vFmt: v => fr(v), margeGauche: 110, margeDroite: 260, renvoi: true,
        series: [
          { pts: d.EUCOM, couleur: 'encre', nom: 'EUCOM', etqLigne: true, etape: 0, marques: [[9, -34, 0, 0, 1]] },
          { pts: d.INDOPACOM, couleur: 'accent', nom: 'INDOPACOM', etqLigne: true, etape: 1 }
        ]
      };
    },
    // Jours d'exercice par année et commandement du lieu, tous les commandements, 2014-2025
    exercices_jours_cocom: () => ({
      type: aires, presidents: true, x: [2013.5, 2025.5], y: [0, 2500],
      xTicks: [2014, 2016, 2018, 2020, 2022, 2024], yTicks: [0, 500, 1000, 1500, 2000, 2500],
      yFmt: v => fr(v), vFmt: v => fr(v), margeGauche: 110, bandes: D().cocom.exercices_jours_cocom,
      surligner: [['EUCOM'], ['INDOPACOM'], []]
    }),
    // Militaires en mer, par mer et par année, 2021-2025
    mers: () => ({
      type: grille, annees: [2021, 2022, 2023, 2024, 2025], lignes: D().cocom.mers,
      surligner: [['Méditerranée', 'Mer du Nord'], ["Mer d'Arabie", 'Golfe Persique', 'Mer Rouge'],
                  ['Mer de Chine méridionale', 'Mer des Caraïbes']]
    }),
    // Exercices par commandement, 2014-2025 au total
    exercices_cocom: () => ({
      type: barres, max: 420, margeGauche: 230, barres: D().cocom.exercices_cocom,
      surligner: [['EUCOM'], ['INDOPACOM'], ['CENTCOM', 'NORTHCOM', 'AFRICOM', 'SOUTHCOM']]
    }),
    // Cadre des exercices par année : OTAN, entre pays, sans partenaire
    exercices_cadre: () => ({
      type: aires, presidents: true, x: [2013.5, 2025.5], y: [0, 160],
      xTicks: [2014, 2016, 2018, 2020, 2022, 2024], yTicks: [0, 40, 80, 120, 160],
      yFmt: v => fr(v), vFmt: v => fr(v), margeGauche: 100, bandes: D().cocom.exercices_cadre,
      surligner: [['OTAN'], ['Entre pays'], ['OTAN']]
    }),
    // Exercices avec le Canada, par année et groupe de commandements, 2014-2025
    exercices_canada_annees: () => ({
      type: aires, presidents: true, x: [2013.5, 2025.5], y: [0, 50],
      xTicks: [2014, 2016, 2018, 2020, 2022, 2024], yTicks: [0, 10, 20, 30, 40, 50],
      yFmt: v => fr(v), vFmt: v => fr(v), margeGauche: 100, bandes: D().cocom.exercices_canada_annees,
      surligner: [['EUCOM'], ['INDOPACOM'], []]
    }),
    // Exercices avec le Canada, par commandement du lieu, 2014-2025
    exercices_canada: () => ({
      type: barres, max: 130, margeGauche: 230, barres: D().cocom.exercices_canada,
      surligner: [['EUCOM'], ['INDOPACOM'], ['NORTHCOM']]
    }),
    // Pays partenaires dans le temps : exercices par année, deux Européens et deux Indo-Pacifiques
    exercices_partenaires_annees: () => {
      const d = D().cocom.exercices_partenaires_annees;
      return {
        type: courbes, presidents: true, x: [2013.5, 2025.5], y: [0, 80],
        xTicks: [2014, 2016, 2018, 2020, 2022, 2024], yTicks: [0, 20, 40, 60, 80], ref: 0,
        yFmt: v => fr(v), vFmt: v => fr(v), margeGauche: 100, margeDroite: 260, renvoi: true,
        series: [
          { pts: d['Royaume-Uni'], couleur: 'accent', nom: 'Royaume-Uni', etqLigne: true, etape: 0, attenue: 1, marques: [[10, -34, 0, 0, 1]] },
          { pts: d['France'], couleur: 'encre', nom: 'France', etqLigne: true, etape: 0, attenue: 1, etqDy: -3 },
          { pts: d['Japon'], couleur: 'accent', nom: 'Japon', etqLigne: true, etape: 1, etqDy: 11 },
          { pts: d['Australie'], couleur: 'encre', nom: 'Australie', etqLigne: true, etape: 1, etqDy: 24 }
        ]
      };
    },
    // Pays partenaires : nombre d'exercices avec les États-Unis, 2014-2025, les 12 premiers
    exercices_partenaires: () => ({
      type: barres, max: 420, margeGauche: 230, barres: D().cocom.exercices_partenaires,
      surligner: [['Royaume-Uni'],
                  ['Royaume-Uni', 'France', 'Allemagne', 'Canada', 'Italie', 'Pologne', 'Pays-Bas', 'Espagne', 'Turquie', 'Lituanie'],
                  ['Australie', 'Japon']]
    }),
    // Militaires dans les deux commandements, pays et territoires seulement (sans les mers)
    cocom: () => ({
      type: courbes, presidents: true, x: [2013.5, 2025.5], y: [0, 120000],
      xTicks: [2014, 2016, 2018, 2020, 2022, 2024], yTicks: [0, 30000, 60000, 90000, 120000], ref: 0,
      yFmt: v => fr(v), vFmt: v => fr(Math.round(v / 100) * 100), margeGauche: 130, margeDroite: 300, renvoi: true,
      series: [
        { pts: D().cocom.INDOPACOM, couleur: 'accent', nom: 'INDOPACOM', etqLigne: true, etape: 0, etqDy: -8 },
        { pts: D().cocom.EUCOM, couleur: 'encre', nom: 'EUCOM', etqLigne: true, etape: 1, etqDy: 10, marques: [[8, 90, 1, 60]] }
      ]
    }),
    // 2021-2025 seulement (l'IISS ne compte les militaires en mer que depuis 2021) :
    // traits pleins = sur terre ; tirets = sur terre et en mer. L'écart = les militaires en mer.
    cocom_mer: () => {
      const depuis2021 = pts => pts.filter(p => p[0] >= 2021);
      return {
        type: courbes, presidents: true, x: [2020.5, 2025.5], y: [0, 120000],
        xTicks: [2021, 2022, 2023, 2024, 2025], yTicks: [0, 30000, 60000, 90000, 120000], ref: 0,
        yFmt: v => fr(v), vFmt: v => fr(Math.round(v / 100) * 100), margeGauche: 130, margeDroite: 300, renvoi: true,
        series: [
          { pts: depuis2021(D().cocom.INDOPACOM), couleur: 'accent', nom: 'INDOPACOM', etqLigne: true, etape: 0, etqDy: 4 },
          { pts: depuis2021(D().cocom.EUCOM), couleur: 'encre', nom: 'EUCOM', etqLigne: true, etape: 0, etqDy: 10 },
          { pts: D().cocom.INDOPACOM_mer, couleur: 'accent', nom: 'avec la mer', etqLigne: true, etape: 1,
            epaisseur: 3, tirets: '10 8', etqDy: -10 },
          { pts: D().cocom.EUCOM_mer, couleur: 'encre', etape: 2, epaisseur: 3, tirets: '10 8', marques: [[3, -40, 2, -50]] }
        ]
      };
    },
    // Aires empilées par pays, 2014-2025, sans les mers
    indopacom_terre: () => ({
      type: aires, presidents: true, x: [2013.5, 2025.5], y: [0, 110000],
      xTicks: [2014, 2016, 2018, 2020, 2022, 2024], yTicks: [0, 25000, 50000, 75000, 100000],
      yFmt: v => fr(v), vFmt: v => fr(v), bandes: D().cocom.indopacom_terre,
      surligner: [['Japon'], ['Corée du Sud'], ['Guam (É.-U.)', 'Australie']]
    }),
    eucom_terre: () => ({
      type: aires, presidents: true, x: [2013.5, 2025.5], y: [0, 110000],
      xTicks: [2014, 2016, 2018, 2020, 2022, 2024], yTicks: [0, 25000, 50000, 75000, 100000],
      yFmt: v => fr(v), vFmt: v => fr(v), bandes: D().cocom.eucom_terre,
      surligner: [['Allemagne'], ['Pologne', 'Roumanie'], ['Italie', 'Royaume-Uni']]
    }),
    // Même chose, 2021-2025, mers comprises
    indopacom_mer: () => ({
      type: aires, presidents: true, x: [2020.5, 2025.5], y: [0, 110000],
      xTicks: [2021, 2022, 2023, 2024, 2025], yTicks: [0, 25000, 50000, 75000, 100000],
      yFmt: v => fr(v), vFmt: v => fr(v), margeDroite: 380, bandes: D().cocom.indopacom_mer,
      surligner: [['Japon', 'Corée du Sud', 'Guam (É.-U.)', 'Australie'], ['Mer de Chine méridionale']]
    }),
    eucom_mer: () => ({
      type: aires, presidents: true, x: [2020.5, 2025.5], y: [0, 125000],
      xTicks: [2021, 2022, 2023, 2024, 2025], yTicks: [0, 25000, 50000, 75000, 100000, 125000],
      yFmt: v => fr(v), vFmt: v => fr(v), bandes: D().cocom.eucom_mer,
      surligner: [['Pologne'], ['Méditerranée', 'Mer du Nord']]
    })
  };

  // ---- Branchement sur Reveal : l'étape suit le fragment courant ---------------------------------------
  // ?statique (ou ?print-pdf) : graphiques complets sans animation, pour l'impression et les vérifications
  const STATIQUE = /statique|print-pdf/.test(location.search);
  window.brancherGraphiques = function (Reveal) {
    const graphiques = [];
    document.querySelectorAll('[data-graphique]').forEach(c => {
      const cfg = CONFIGS[c.dataset.graphique]();
      graphiques.push({ section: c.closest('section'), g: cfg.type(c, cfg) });
    });
    const etape = section => section.querySelectorAll('.fragment.visible').length
      ? Math.max(...[...section.querySelectorAll('.fragment.visible')].map(f => +f.dataset.fragmentIndex)) + 1 : 0;
    const maj = animer => {
      const courante = Reveal.getCurrentSlide();
      for (const { section, g } of graphiques) g.regler(section === courante ? etape(section) : -1, animer && !STATIQUE && section === courante);
    };
    // Impression (?print-pdf) : Reveal copie chaque diapositive une fois par étape (fragments). Les copies
    // n'ont pas de JavaScript : on redessine le graphique de chaque page, à l'étape de cette page.
    Reveal.on('pdf-ready', () => {
      document.querySelectorAll('.pdf-page [data-graphique]').forEach(c => {
        c.innerHTML = '';
        const cfg = CONFIGS[c.dataset.graphique]();
        cfg.type(c, cfg).regler(etape(c.closest('section')), false);
      });
      document.body.dataset.pdfPret = '1';
    });
    Reveal.on('ready', () => maj(true));
    Reveal.on('slidechanged', () => maj(true));
    Reveal.on('fragmentshown', () => maj(true));
    Reveal.on('fragmenthidden', () => maj(false));
  };
})();
