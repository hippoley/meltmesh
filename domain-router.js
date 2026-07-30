(function () {
  const previous = new Map();
  const labels = {
    implicitGeometry: '隐式几何',
    phaseField: '相场演化',
    optical: '折射材质',
  };
  let previousTime = performance.now() / 1000;
  let contactAge = 0;
  let lastUiUpdate = 0;

  const clamp = value => Math.max(0, Math.min(1, value));
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

  function updateUi(model, time) {
    if (time - lastUiUpdate < 0.12) return;
    lastUiUpdate = time;
    const primary = document.getElementById('domainPrimary');
    const signature = document.getElementById('domainSignature');
    if (!primary || !signature) return;

    primary.textContent = labels[model.primary];
    for (const [domain, weight] of Object.entries(model.domains)) {
      const bar = document.getElementById(`domain-${domain}`);
      const value = document.getElementById(`domain-${domain}-value`);
      if (bar) bar.style.setProperty('--weight', `${Math.round(weight * 100)}%`);
      if (value) value.textContent = `${Math.round(weight * 100)}%`;
    }
    const s = model.signature;
    signature.textContent = `接近 ${s.proximity.toFixed(2)} · 穿透 ${s.penetration.toFixed(2)} · 速度 ${s.relativeSpeed.toFixed(2)}`;
  }

  function update(state, time = performance.now() / 1000) {
    const dt = Math.max(1 / 240, Math.min(0.1, time - previousTime));
    previousTime = time;
    const objects = [state.objects.sphere, state.objects.box, ...(state.imported || [])].filter(Boolean);
    let speed = 0;

    for (const [index, object] of objects.entries()) {
      const old = previous.get(index);
      if (old) {
        speed = Math.max(
          speed,
          Math.hypot(...object.position.map((value, axis) => value - old[axis])) / dt,
        );
      }
      previous.set(index, [...object.position]);
    }

    let separation = Infinity;
    for (let i = 0; i < objects.length; i++) {
      for (let j = i + 1; j < objects.length; j++) {
        const a = objects[i];
        const b = objects[j];
        const distance = Math.hypot(...a.position.map((value, axis) => value - b.position[axis]));
        separation = Math.min(separation, distance - radiusOf(a) - radiusOf(b));
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
    const primary = Object.entries(domains).sort((a, b) => b[1] - a[1])[0][0];
    state.domainModel = {
      signature: { proximity, penetration, relativeSpeed: speed, contactDuration: contactAge, materialContrast, objectCount: objects.length },
      domains,
      effective,
      primary,
    };
    updateUi(state.domainModel, time);
    return state.domainModel;
  }

  window.mathDomainRouter = { update };
})();
