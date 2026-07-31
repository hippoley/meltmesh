(function () {
  const previous = new Map();
  const labelKeys = {
    implicitGeometry: 'implicit',
    phaseField: 'phase',
    optical: 'optical',
  };

  let previousTime = performance.now() / 1000;
  let contactAge = 0;
  let lastUiUpdate = 0;
  let lastModel = null;
  const roleAffinity = {
    real: { real: 0.35, memory: 0.85, hybrid: 0.62 },
    memory: { real: 1.0, memory: 0.48, hybrid: 0.78 },
    hybrid: { real: 0.72, memory: 0.72, hybrid: 0.58 },
  };

  const clamp = value => Math.max(0, Math.min(1, value));
  const translate = (key, params = {}) => {
    const i18n = window.meltmeshI18n;
    return i18n && i18n.translate ? i18n.translate(i18n.currentLanguage, key, params) : key;
  };
  const softmax = values => {
    const peak = Math.max(...values);
    const weights = values.map(value => Math.exp(value - peak));
    const sum = weights.reduce((a, b) => a + b, 0);
    return weights.map(value => value / sum);
  };
  const radiusOf = object => {
    if (!object) return 0;
    if (Array.isArray(object.bounds)) return Math.hypot(...object.bounds) * (object.scale || 1) * 0.72;
    return (object.scale || 1) * 0.72;
  };
  const roleOf = object => object && object.role || 'real';
  const ensureResidue = object => {
    if (!object.residue) object.residue = {
      strength: 0,
      memory: 0,
      optical: 0,
      geometry: 0,
      color: [0.72, 0.93, 1],
    };
    return object.residue;
  };
  const sourceColorOf = object => {
    const report = object && object.materialReport;
    if (report && Array.isArray(report.sourceColor)) return report.sourceColor;
    if (Array.isArray(object && object.residue && object.residue.color)) return object.residue.color;
    return roleOf(object) === 'memory' ? [0.62, 0.48, 1.0] : roleOf(object) === 'hybrid' ? [0.1, 0.95, 0.82] : [0.72, 0.93, 1.0];
  };

  function updateUi(model, time, force = false) {
    if (!force && time - lastUiUpdate < 0.12) return;
    lastUiUpdate = time;
    const primary = document.getElementById('domainPrimary');
    const signature = document.getElementById('domainSignature');
    if (!primary || !signature) return;

    primary.textContent = translate(labelKeys[model.primary]);
    for (const [domain, weight] of Object.entries(model.domains)) {
      const bar = document.getElementById(`domain-${domain}`);
      const value = document.getElementById(`domain-${domain}-value`);
      if (bar) bar.style.setProperty('--weight', `${Math.round(weight * 100)}%`);
      if (value) value.textContent = `${Math.round(weight * 100)}%`;
    }
    const s = model.signature;
    signature.textContent = translate('domainSignatureLive', {
      proximity: s.proximity.toFixed(2),
      penetration: s.penetration.toFixed(2),
      speed: s.relativeSpeed.toFixed(2),
    });
    const residueValue = document.getElementById('exchangeResidueValue');
    const roleValue = document.getElementById('exchangeRoleValue');
    if (residueValue && roleValue) {
      const selected = window.__meltmeshState && window.__meltmeshState.objects && window.__meltmeshState.objects[window.__meltmeshState.selected];
      const residue = selected && selected.residue;
      const memoryValue = document.getElementById('exchangeMemoryValue');
      const opticalValue = document.getElementById('exchangeOpticalValue');
      const residueBar = document.getElementById('exchangeResidueBar');
      const memoryBar = document.getElementById('exchangeMemoryBar');
      const opticalBar = document.getElementById('exchangeOpticalBar');
      roleValue.textContent = translate(`role_${roleOf(selected)}`);
      residueValue.textContent = residue ? `${Math.round(residue.strength * 100)}%` : '--';
      if (memoryValue) memoryValue.textContent = residue ? `${Math.round(residue.memory * 100)}%` : '--';
      if (opticalValue) opticalValue.textContent = residue ? `${Math.round(residue.optical * 100)}%` : '--';
      if (residueBar) residueBar.style.setProperty('--weight', residue ? `${Math.round(residue.strength * 100)}%` : '0%');
      if (memoryBar) memoryBar.style.setProperty('--weight', residue ? `${Math.round(residue.memory * 100)}%` : '0%');
      if (opticalBar) opticalBar.style.setProperty('--weight', residue ? `${Math.round(residue.optical * 100)}%` : '0%');
    }
  }

  function update(state, time = performance.now() / 1000) {
    window.__meltmeshState = state;
    const dt = Math.max(1 / 240, Math.min(0.1, time - previousTime));
    previousTime = time;
    const objects = [
      ['sphere', state.objects.sphere],
      ['box', state.objects.box],
      ...(state.imported || []).map((object, index) => [`mesh-${index}`, object]),
    ].filter(([, object]) => object);
    let speed = 0;

    for (const [id, object] of objects) {
      ensureResidue(object);
      const old = previous.get(id);
      if (old) {
        speed = Math.max(
          speed,
          Math.hypot(...object.position.map((value, axis) => value - old[axis])) / dt,
        );
      }
      previous.set(id, [...object.position]);
    }

    let separation = Infinity;
    const pairs = [];
    for (let i = 0; i < objects.length; i++) {
      for (let j = i + 1; j < objects.length; j++) {
        const [idA, a] = objects[i];
        const [idB, b] = objects[j];
        const distance = Math.hypot(...a.position.map((value, axis) => value - b.position[axis]));
        const pairSeparation = distance - radiusOf(a) - radiusOf(b);
        separation = Math.min(separation, pairSeparation);
        const kernel = clamp(1 - pairSeparation / Math.max(state.blend * 2.8, 0.16));
        if (kernel > 0.02) pairs.push({ ids: [idA, idB], objects: [a, b], separation: pairSeparation, kernel });
      }
    }

    const proximity = clamp(1 - separation / Math.max(state.blend * 3, 0.15));
    const penetration = clamp(-separation / Math.max(state.blend, 0.08));
    contactAge = proximity > 0.15
      ? Math.min(8, contactAge + dt)
      : Math.max(0, contactAge - dt * 2);
    const materialContrast = clamp(
      Math.abs(state.transmission - state.roughness) * 0.7
      + Math.abs(state.specular - 0.5) * 0.3,
    );
    const weights = softmax([
      1.2 * proximity + 0.8 * penetration - 0.12 * speed,
      1.4 * penetration + 0.22 * contactAge + 0.35 * materialContrast - 0.18 * speed,
      0.95 * materialContrast + 0.65 * proximity + 0.08 * contactAge,
    ]);
    const domains = {
      implicitGeometry: weights[0],
      phaseField: weights[1],
      optical: weights[2],
    };
    const effective = {
      blend: state.blend * (0.72 + 0.58 * domains.implicitGeometry + 0.34 * domains.phaseField),
      consumeScale: state.consumeScale * (0.7 + 0.75 * domains.phaseField),
      frontNoise: state.frontNoise * (0.55 + 0.9 * domains.phaseField),
      transmission: clamp(state.transmission * (0.65 + 0.5 * domains.optical)),
    };
    const decay = Math.exp(-dt * Math.max(state.recoveryRate, 0.01) * 1.8);
    for (const [, object] of objects) {
      const residue = ensureResidue(object);
      residue.strength *= decay;
      residue.memory *= decay;
      residue.optical *= decay;
      residue.geometry *= decay;
    }
    for (const pair of pairs) {
      const [a, b] = pair.objects;
      const impulse = pair.kernel * (0.35 + penetration * 0.65) * (0.45 + contactAge * 0.08) * dt * Math.max(state.dissolveRate, 0.05);
      for (const [target, source] of [[a, b], [b, a]]) {
        const residue = ensureResidue(target);
        const sourceColor = sourceColorOf(source);
        const affinity = roleAffinity[roleOf(source)]?.[roleOf(target)] ?? 0.55;
        const amount = clamp(impulse * affinity);
        residue.strength = clamp(residue.strength + amount * (1 - residue.strength));
        residue.memory = clamp(residue.memory + amount * (roleOf(source) === 'memory' ? 1.35 : 0.62));
        residue.optical = clamp(residue.optical + amount * (0.7 + domains.optical));
        residue.geometry = clamp(residue.geometry + amount * (0.55 + domains.phaseField));
        residue.color = residue.color.map((value, axis) => value * (1 - amount) + sourceColor[axis] * amount);
      }
    }
    const primary = Object.entries(domains).sort((a, b) => b[1] - a[1])[0][0];
    lastModel = {
      signature: { proximity, penetration, relativeSpeed: speed, contactDuration: contactAge, materialContrast, objectCount: objects.length },
      domains,
      effective,
      primary,
      contactGroups: pairs.map(pair => ({ ids: pair.ids, strength: pair.kernel })),
    };
    state.domainModel = lastModel;
    updateUi(lastModel, time);
    return lastModel;
  }

  window.addEventListener('meltmesh-language-change', () => {
    if (lastModel) updateUi(lastModel, performance.now() / 1000, true);
  });

  window.mathDomainRouter = { update };
})();
