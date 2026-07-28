/**
 * Kid-friendly chibi cartoon animals for Three.js.
 * Returns rig refs used by scene.html for animation + lip sync.
 */
export function createCartoonAnimal(THREE, characterId) {
  const id = characterId || "buddy";

  const PALETTES = {
    bunny: { fur: 0xfff5e8, accent: 0xff9ec4, belly: 0xffffff, nose: 0xff6b9d, paw: 0xffc0d9, feature: 0xffb6d5 },
    panda: { fur: 0xffffff, accent: 0x1a1a1a, belly: 0xffffff, nose: 0x111111, paw: 0x1a1a1a, feature: 0x333333 },
    dolphin: { fur: 0x5ec8e8, accent: 0x3a9bb8, belly: 0xd4f4ff, nose: 0x2d7a94, paw: 0x3a9bb8, feature: 0x7ad4f0 },
    owl: { fur: 0xd4a574, accent: 0x5c3d2e, belly: 0xf5e6d3, nose: 0xff9f43, paw: 0xff9f43, feature: 0xc48a5a },
    fox: { fur: 0xff8c42, accent: 0xffffff, belly: 0xfff3e0, nose: 0x1a1a1a, paw: 0x1a1a1a, feature: 0xff6b2b },
    turtle: { fur: 0x7dce82, accent: 0x2e7d32, belly: 0xc8f0a8, nose: 0x1b5e20, paw: 0x4caf50, feature: 0x66bb6a },
    koala: { fur: 0xb0bec5, accent: 0x78909c, belly: 0xeceff1, nose: 0x37474f, paw: 0x90a4ae, feature: 0x90a4ae },
    duck: { fur: 0xffe566, accent: 0xff9f43, belly: 0xfff8dc, nose: 0xff9f43, paw: 0xff9f43, feature: 0xffc107 },
    star: { fur: 0xffd93d, accent: 0xff6b9d, belly: 0xfff59d, nose: 0xff6b9d, paw: 0xff8a65, feature: 0xffe082 },
    buddy: { fur: 0x5b9dff, accent: 0xffffff, belly: 0xa8d0ff, nose: 0xff6b9d, paw: 0xffffff, feature: 0x7eb3ff },
  };
  const c = PALETTES[id] || PALETTES.buddy;

  function mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.42,
      metalness: opts.metalness ?? 0.02,
      ...opts,
    });
  }

  function mesh(geo, color, opts = {}) {
    const m = new THREE.Mesh(geo, mat(color, opts));
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  const character = new THREE.Group();
  const bodyGroup = new THREE.Group();
  character.add(bodyGroup);

  // --- Shared chibi proportions ---
  const torso = mesh(new THREE.SphereGeometry(0.78, 40, 32), c.fur);
  torso.position.y = 0.95;
  torso.scale.set(1.05, 1.0, 0.92);
  bodyGroup.add(torso);

  const belly = mesh(new THREE.SphereGeometry(0.52, 28, 22), c.belly);
  belly.position.set(0, 0.85, 0.42);
  belly.scale.set(1.05, 1.1, 0.55);
  bodyGroup.add(belly);

  const head = new THREE.Group();
  head.position.y = 2.05;
  bodyGroup.add(head);

  const headMesh = mesh(new THREE.SphereGeometry(0.78, 40, 32), c.fur);
  head.add(headMesh);

  // Big cute eyes
  const eyeWhiteL = mesh(new THREE.SphereGeometry(0.2, 20, 16), 0xffffff);
  eyeWhiteL.position.set(-0.26, 0.12, 0.62);
  eyeWhiteL.scale.set(1, 1.15, 0.7);
  head.add(eyeWhiteL);
  const eyeWhiteR = eyeWhiteL.clone();
  eyeWhiteR.position.x = 0.26;
  head.add(eyeWhiteR);

  const pupilL = mesh(new THREE.SphereGeometry(0.11, 16, 12), 0x1a1a2e, { roughness: 0.15 });
  pupilL.position.set(-0.26, 0.12, 0.76);
  head.add(pupilL);
  const pupilR = pupilL.clone();
  pupilR.position.x = 0.26;
  head.add(pupilR);

  const shineL = mesh(new THREE.SphereGeometry(0.045, 10, 8), 0xffffff);
  shineL.position.set(-0.22, 0.18, 0.84);
  head.add(shineL);
  const shineR = shineL.clone();
  shineR.position.x = 0.3;
  head.add(shineR);

  const blinkL = mesh(new THREE.BoxGeometry(0.34, 0.05, 0.1), c.fur);
  blinkL.position.set(-0.26, 0.12, 0.74);
  blinkL.visible = false;
  head.add(blinkL);
  const blinkR = blinkL.clone();
  blinkR.position.x = 0.26;
  head.add(blinkR);

  // Blush
  const blushL = mesh(new THREE.CircleGeometry(0.12, 16), 0xff8fab, {
    transparent: true,
    opacity: 0.55,
    roughness: 1,
  });
  blushL.position.set(-0.48, -0.05, 0.58);
  head.add(blushL);
  const blushR = blushL.clone();
  blushR.position.x = 0.48;
  head.add(blushR);

  // Mouth (lip sync)
  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, -0.28, 0.68);
  head.add(mouthGroup);

  const smileClosed = mesh(new THREE.TorusGeometry(0.16, 0.032, 8, 24, Math.PI), 0x1a1a2e, {
    roughness: 0.35,
  });
  smileClosed.position.set(0, 0.02, 0.04);
  smileClosed.rotation.set(Math.PI, 0, Math.PI);
  mouthGroup.add(smileClosed);

  const mouthOpen = new THREE.Group();
  mouthOpen.visible = false;
  mouthGroup.add(mouthOpen);

  const cavity = mesh(new THREE.SphereGeometry(0.14, 18, 14), 0x4a1520, { roughness: 0.75 });
  cavity.scale.set(1.2, 0.5, 0.95);
  mouthOpen.add(cavity);

  const teeth = mesh(new THREE.BoxGeometry(0.2, 0.05, 0.045), 0xffffff, { roughness: 0.2 });
  teeth.position.set(0, 0.04, 0.06);
  mouthOpen.add(teeth);

  const tongue = mesh(new THREE.SphereGeometry(0.06, 12, 10), 0xff6b8a, { roughness: 0.5 });
  tongue.scale.set(1.6, 0.45, 1.1);
  tongue.position.set(0, -0.045, 0.05);
  mouthOpen.add(tongue);

  const nose = mesh(new THREE.SphereGeometry(0.1, 14, 12), c.nose);
  nose.position.set(0, -0.02, 0.74);
  head.add(nose);

  function setMouthOpen(amount) {
    const a = Math.max(0, Math.min(1, amount || 0));
    const open = a > 0.1;
    smileClosed.visible = !open;
    mouthOpen.visible = open;
    if (open) {
      cavity.scale.set(1.2, 0.4 + a * 0.85, 0.95);
      cavity.position.y = -a * 0.05;
      tongue.visible = a > 0.3;
    }
    head.rotation.x = open ? a * 0.05 : 0;
  }
  setMouthOpen(0);

  // Arms
  const armL = new THREE.Group();
  armL.position.set(-0.9, 1.15, 0.05);
  bodyGroup.add(armL);
  const armLMesh = mesh(new THREE.CapsuleGeometry(0.2, 0.45, 8, 14), c.fur);
  armLMesh.position.y = -0.35;
  armL.add(armLMesh);
  const pawL = mesh(new THREE.SphereGeometry(0.22, 16, 12), c.paw);
  pawL.position.set(0, -0.65, 0.05);
  armL.add(pawL);

  const armR = new THREE.Group();
  armR.position.set(0.9, 1.15, 0.05);
  bodyGroup.add(armR);
  const armRMesh = armLMesh.clone();
  armR.add(armRMesh);
  const pawR = pawL.clone();
  armR.add(pawR);

  // Legs + feet
  const legL = new THREE.Group();
  legL.position.set(-0.35, 0.35, 0.05);
  bodyGroup.add(legL);
  const legLMesh = mesh(new THREE.CapsuleGeometry(0.22, 0.25, 8, 14), c.fur);
  legL.add(legLMesh);
  const footL = mesh(new THREE.SphereGeometry(0.26, 16, 12), c.paw);
  footL.position.set(0, -0.35, 0.12);
  footL.scale.set(1.1, 0.55, 1.35);
  legL.add(footL);

  const legR = new THREE.Group();
  legR.position.set(0.35, 0.35, 0.05);
  bodyGroup.add(legR);
  legR.add(legLMesh.clone());
  const footR = footL.clone();
  legR.add(footR);

  // --- Species-specific features ---
  function addLongEars() {
    for (const side of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(side * 0.32, 0.7, -0.05);
      ear.rotation.z = side * 0.2;
      ear.rotation.x = -0.15;
      const outer = mesh(new THREE.CapsuleGeometry(0.16, 0.75, 8, 12), c.fur);
      ear.add(outer);
      const inner = mesh(new THREE.CapsuleGeometry(0.09, 0.55, 6, 10), c.accent);
      inner.position.z = 0.06;
      ear.add(inner);
      head.add(ear);
    }
    const tail = mesh(new THREE.SphereGeometry(0.28, 16, 12), 0xffffff);
    tail.position.set(0, 0.7, -0.75);
    bodyGroup.add(tail);
  }

  function addRoundEars(dark = false) {
    for (const side of [-1, 1]) {
      const ear = mesh(new THREE.SphereGeometry(0.32, 20, 16), dark ? c.accent : c.fur);
      ear.position.set(side * 0.62, 0.55, -0.08);
      head.add(ear);
      if (!dark) {
        const inner = mesh(new THREE.SphereGeometry(0.16, 12, 10), c.accent);
        inner.position.set(side * 0.62, 0.55, 0.08);
        head.add(inner);
      }
    }
  }

  function addPointyEars() {
    for (const side of [-1, 1]) {
      const ear = mesh(new THREE.ConeGeometry(0.2, 0.5, 10), c.fur);
      ear.position.set(side * 0.4, 0.85, -0.05);
      ear.rotation.z = side * -0.3;
      head.add(ear);
      const inner = mesh(new THREE.ConeGeometry(0.1, 0.28, 8), c.accent);
      inner.position.set(side * 0.4, 0.78, 0.06);
      inner.rotation.z = side * -0.3;
      head.add(inner);
    }
  }

  if (id === "bunny") {
    addLongEars();
    nose.scale.set(1.2, 0.9, 1);
    nose.position.set(0, -0.06, 0.76);
  }

  if (id === "panda") {
    addRoundEars(true);
    for (const side of [-1, 1]) {
      const patch = mesh(new THREE.SphereGeometry(0.24, 16, 12), c.accent);
      patch.position.set(side * 0.3, 0.14, 0.58);
      patch.scale.set(1.1, 0.95, 0.45);
      head.add(patch);
      // Put eyes on top of patches
      eyeWhiteL.position.z = 0.68;
      eyeWhiteR.position.z = 0.68;
    }
    armLMesh.material = mat(c.accent);
    armRMesh.material = mat(c.accent);
    legLMesh.material = mat(c.accent);
    legR.children[0].material = mat(c.accent);
    const band = mesh(new THREE.SphereGeometry(0.82, 28, 18), c.accent);
    band.position.y = 1.0;
    band.scale.set(1.02, 0.35, 0.95);
    bodyGroup.add(band);
  }

  if (id === "koala") {
    addRoundEars(false);
    for (const side of [-1, 1]) {
      const fluff = mesh(new THREE.SphereGeometry(0.38, 16, 12), c.fur);
      fluff.position.set(side * 0.7, 0.5, -0.05);
      head.add(fluff);
    }
    nose.geometry = new THREE.SphereGeometry(0.16, 14, 12);
    nose.scale.set(0.85, 1.15, 0.7);
    nose.position.set(0, -0.08, 0.72);
  }

  if (id === "fox") {
    addPointyEars();
    const snout = mesh(new THREE.SphereGeometry(0.28, 18, 14), c.accent);
    snout.position.set(0, -0.12, 0.7);
    snout.scale.set(0.85, 0.7, 1.1);
    head.add(snout);
    nose.position.set(0, -0.12, 0.92);
    nose.scale.setScalar(0.75);
    const cheekL = mesh(new THREE.SphereGeometry(0.22, 12, 10), c.accent);
    cheekL.position.set(-0.45, -0.05, 0.45);
    head.add(cheekL);
    const cheekR = cheekL.clone();
    cheekR.position.x = 0.45;
    head.add(cheekR);
    const tail = mesh(new THREE.SphereGeometry(0.35, 18, 14), c.fur);
    tail.position.set(0.15, 0.85, -0.85);
    tail.scale.set(0.9, 0.9, 1.8);
    bodyGroup.add(tail);
    const tip = mesh(new THREE.SphereGeometry(0.22, 12, 10), 0xffffff);
    tip.position.set(0.15, 0.85, -1.35);
    bodyGroup.add(tip);
  }

  if (id === "owl") {
    torso.scale.set(1.15, 1.05, 1.0);
    headMesh.scale.set(1.05, 1.0, 1.0);
    for (const side of [-1, 1]) {
      const tuft = mesh(new THREE.ConeGeometry(0.12, 0.35, 8), c.accent);
      tuft.position.set(side * 0.35, 0.85, -0.05);
      tuft.rotation.z = side * -0.25;
      head.add(tuft);
      const ring = mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 20), c.feature);
      ring.position.set(side * 0.26, 0.12, 0.58);
      head.add(ring);
    }
    eyeWhiteL.material = mat(0xfff59d);
    eyeWhiteR.material = mat(0xfff59d);
    nose.geometry = new THREE.ConeGeometry(0.1, 0.22, 8);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, -0.05, 0.78);
    // Wing-like arms
    armLMesh.scale.set(1.2, 0.7, 0.5);
    armRMesh.scale.set(1.2, 0.7, 0.5);
  }

  if (id === "duck") {
    headMesh.scale.set(0.92, 0.92, 0.92);
    // Big orange duck bill that reads clearly on camera
    const beakTop = mesh(new THREE.SphereGeometry(0.34, 18, 14), c.accent);
    beakTop.position.set(0, -0.1, 0.95);
    beakTop.scale.set(1.05, 0.42, 1.65);
    head.add(beakTop);
    const beakBot = mesh(new THREE.SphereGeometry(0.26, 14, 12), 0xff8c42);
    beakBot.position.set(0, -0.24, 0.92);
    beakBot.scale.set(0.95, 0.32, 1.4);
    head.add(beakBot);
    const nostrilL = mesh(new THREE.SphereGeometry(0.035, 8, 6), 0xe67e22);
    nostrilL.position.set(-0.1, -0.02, 1.35);
    head.add(nostrilL);
    const nostrilR = nostrilL.clone();
    nostrilR.position.x = 0.1;
    head.add(nostrilR);
    // Cute feather tuft
    const tuft = mesh(new THREE.SphereGeometry(0.16, 12, 10), c.fur);
    tuft.position.set(0.08, 0.85, 0.05);
    tuft.scale.set(0.7, 1.4, 0.7);
    head.add(tuft);
    const tuft2 = mesh(new THREE.SphereGeometry(0.12, 10, 8), c.fur);
    tuft2.position.set(-0.05, 0.92, -0.02);
    tuft2.scale.set(0.6, 1.2, 0.6);
    head.add(tuft2);
    nose.visible = false;
    mouthGroup.position.set(0, -0.28, 1.15);
    teeth.visible = false;
    // Broad wings
    armLMesh.material = mat(c.fur);
    armRMesh.material = mat(c.fur);
    armLMesh.scale.set(1.55, 0.5, 0.32);
    armRMesh.scale.set(1.55, 0.5, 0.32);
    armL.position.set(-0.95, 1.05, 0.1);
    armR.position.set(0.95, 1.05, 0.1);
    footL.scale.set(1.5, 0.35, 1.7);
    footR.scale.set(1.5, 0.35, 1.7);
    footL.material = mat(c.accent);
    footR.material = mat(c.accent);
  }

  if (id === "turtle") {
    torso.visible = false;
    belly.visible = false;
    const shell = mesh(new THREE.SphereGeometry(0.95, 28, 20), c.accent, { roughness: 0.65 });
    shell.position.set(0, 1.0, -0.1);
    shell.scale.set(1.15, 0.85, 1.05);
    bodyGroup.add(shell);
    const shellBelly = mesh(new THREE.SphereGeometry(0.7, 20, 16), c.belly);
    shellBelly.position.set(0, 0.85, 0.35);
    shellBelly.scale.set(1.1, 0.7, 0.55);
    bodyGroup.add(shellBelly);
    for (const [x, y, z] of [
      [-0.35, 1.25, -0.5],
      [0.35, 1.2, -0.45],
      [0, 1.45, -0.35],
      [-0.2, 1.05, -0.7],
      [0.25, 1.1, -0.65],
    ]) {
      const scute = mesh(new THREE.SphereGeometry(0.18, 10, 8), c.feature);
      scute.position.set(x, y, z);
      bodyGroup.add(scute);
    }
    head.position.y = 1.85;
    head.position.z = 0.55;
    headMesh.scale.setScalar(0.75);
  }

  if (id === "dolphin") {
    torso.scale.set(0.9, 1.05, 1.25);
    torso.rotation.x = 0.15;
    legL.visible = false;
    legR.visible = false;
    // Melon + longer snout so it reads as a dolphin, not a blue blob
    const melon = mesh(new THREE.SphereGeometry(0.55, 24, 18), c.fur);
    melon.position.set(0, 0.15, 0.15);
    melon.scale.set(1.05, 0.85, 1.15);
    head.add(melon);
    headMesh.scale.set(0.95, 0.9, 1.05);
    const snout = mesh(new THREE.CapsuleGeometry(0.18, 0.55, 8, 14), c.belly);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.12, 1.05);
    head.add(snout);
    const snoutTip = mesh(new THREE.SphereGeometry(0.16, 12, 10), c.belly);
    snoutTip.position.set(0, -0.12, 1.4);
    head.add(snoutTip);
    nose.visible = false;
    mouthGroup.position.set(0, -0.22, 1.25);
    teeth.visible = false;
    const dorsal = mesh(new THREE.ConeGeometry(0.32, 0.7, 12), c.accent);
    dorsal.position.set(0, 1.85, -0.2);
    dorsal.rotation.x = 0.35;
    bodyGroup.add(dorsal);
    const tail = mesh(new THREE.SphereGeometry(0.38, 14, 10), c.fur);
    tail.position.set(0, 0.65, -0.95);
    tail.scale.set(1.6, 0.32, 0.75);
    bodyGroup.add(tail);
    const flukeL = mesh(new THREE.SphereGeometry(0.28, 12, 10), c.accent);
    flukeL.position.set(-0.35, 0.55, -1.15);
    flukeL.scale.set(1.2, 0.25, 0.7);
    bodyGroup.add(flukeL);
    const flukeR = flukeL.clone();
    flukeR.position.x = 0.35;
    bodyGroup.add(flukeR);
    armLMesh.scale.set(1.6, 0.4, 0.3);
    armRMesh.scale.set(1.6, 0.4, 0.3);
    armL.position.set(-0.85, 1.1, 0.15);
    armR.position.set(0.85, 1.1, 0.15);
  }

  if (id === "star") {
    torso.visible = false;
    belly.visible = false;
    legL.visible = false;
    legR.visible = false;
    armL.visible = false;
    armR.visible = false;
    headMesh.visible = false;

    const starShape = new THREE.Shape();
    const spikes = 5;
    const outer = 1.15;
    const inner = 0.5;
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) starShape.moveTo(x, y);
      else starShape.lineTo(x, y);
    }
    starShape.closePath();
    const starGeo = new THREE.ExtrudeGeometry(starShape, {
      depth: 0.4,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.08,
      bevelSegments: 3,
    });
    const starMesh = mesh(starGeo, c.fur);
    starMesh.position.set(0, 1.55, -0.15);
    bodyGroup.add(starMesh);

    head.position.y = 1.7;
    head.position.z = 0.35;
    // Keep face parts on head group
    eyeWhiteL.position.set(-0.28, 0.15, 0.25);
    eyeWhiteR.position.set(0.28, 0.15, 0.25);
    pupilL.position.set(-0.28, 0.15, 0.38);
    pupilR.position.set(0.28, 0.15, 0.38);
    shineL.position.set(-0.24, 0.2, 0.45);
    shineR.position.set(0.32, 0.2, 0.45);
    blushL.position.set(-0.45, -0.02, 0.2);
    blushR.position.set(0.45, -0.02, 0.2);
    mouthGroup.position.set(0, -0.25, 0.3);
    nose.position.set(0, -0.02, 0.35);
  }

  if (id === "buddy") {
    for (const side of [-1, 1]) {
      const horn = mesh(new THREE.ConeGeometry(0.12, 0.35, 10), c.feature);
      horn.position.set(side * 0.35, 0.85, 0);
      horn.rotation.z = side * -0.2;
      head.add(horn);
    }
    const antenna = mesh(new THREE.SphereGeometry(0.12, 12, 10), c.accent);
    antenna.position.set(0, 1.05, 0);
    head.add(antenna);
  }

  return {
    character,
    bodyGroup,
    head,
    armL,
    armR,
    legL,
    legR,
    eyeWhiteL,
    eyeWhiteR,
    pupilL,
    pupilR,
    blinkL,
    blinkR,
    setMouthOpen,
  };
}
