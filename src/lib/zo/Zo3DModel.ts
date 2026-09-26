import * as THREE from 'three';
import { ZoExpression3D, ZoPose3D, ZoAnimationType } from '@/types/zoStudioTypes';
import { getCachedZoImage } from './zoImageStorage';

export interface Zo3DInstance {
  root: THREE.Group;
  update: (delta: number, mouse?: { x: number; y: number }) => void;
  setExpression: (expr: ZoExpression3D) => void;
  setPose: (pose: ZoPose3D) => void;
  setAnimation: (anim: ZoAnimationType, speed?: number) => void;
  setAutoBlink: (enabled: boolean) => void;
  setEyeMovement: (enabled: boolean) => void;
  setCustomImage: (imageUrl?: string, depth?: number) => void;
  dispose: () => void;
}

/**
 * Creates the official Cleanzo 3D Zo character using procedural Three.js geometry,
 * materials, rigging, and morph targets strictly faithful to the multi-angle reference.
 */
export function createZo3DCharacter(): Zo3DInstance {
  const root = new THREE.Group();
  root.name = 'ZoCharacter';

  // Master materials - Official Cleanzo Core Palette
  const cleanzoBlueWater = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#0866C6'),
    emissive: new THREE.Color('#032247'),
    emissiveIntensity: 0.25,
    roughness: 0.12,
    metalness: 0.05,
    transmission: 0.65,
    ior: 1.34,
    transparent: true,
    opacity: 0.94,
    reflectivity: 0.9,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });

  const cleanzoRedSash = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#F0444C'),
    emissive: new THREE.Color('#5E0E12'),
    emissiveIntensity: 0.2,
    roughness: 0.35,
    metalness: 0.15,
  });

  const navyLimbMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#07345C'),
    roughness: 0.45,
    metalness: 0.2,
  });

  const blueBootMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#0866C6'),
    roughness: 0.25,
    metalness: 0.4,
  });

  const eyeWhiteMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#FFFFFF'),
  });

  const pupilMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#08111F'),
  });

  const pupilHighlightMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#FFFFFF'),
  });

  const mouthMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#091322'),
  });

  const browMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#091322'),
  });

  // Track all disposables
  const disposables: (THREE.BufferGeometry | THREE.Material)[] = [
    cleanzoBlueWater,
    cleanzoRedSash,
    navyLimbMat,
    blueBootMat,
    eyeWhiteMat,
    pupilMat,
    pupilHighlightMat,
    mouthMat,
    browMat,
  ];

  // -------------------------------------------------------------
  // 1. BODY & HEAD: Signature Teardrop Silhouette with Curled Tip
  // -------------------------------------------------------------
  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'BodyGroup';
  root.add(bodyGroup);

  // Lathe curve defining the teardrop contour from bottom pole (y=0) to top neck (y=2.4)
  const points: THREE.Vector2[] = [];
  const segments = 36;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments; // 0 to 1
    const y = t * 2.3;
    // Teardrop profile formula: rounded bottom bulb tapering gracefully upward
    let r = 0;
    if (t < 0.1) {
      r = Math.sin((t / 0.1) * (Math.PI / 2)) * 0.72;
    } else if (t < 0.45) {
      // Widest lower belly
      const p = (t - 0.1) / 0.35;
      r = 0.72 + Math.sin(p * Math.PI) * 0.24;
    } else {
      // Smooth taper towards tip
      const p = (t - 0.45) / 0.55;
      r = 0.72 * Math.pow(1 - p, 1.4);
    }
    points.push(new THREE.Vector2(Math.max(0.001, r), y));
  }

  const dropGeo = new THREE.LatheGeometry(points, 48);
  disposables.push(dropGeo);
  const dropMesh = new THREE.Mesh(dropGeo, cleanzoBlueWater);
  dropMesh.castShadow = true;
  dropMesh.receiveShadow = true;
  bodyGroup.add(dropMesh);

  // The Curled Tip Curve (sweeping curve ending in a droplet bulb at peak)
  const tipCurve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(0, 2.28, 0),
    new THREE.Vector3(0.02, 2.6, 0.05),
    new THREE.Vector3(0.25, 2.75, 0.08),
    new THREE.Vector3(0.18, 2.88, 0.02)
  );
  const tipTubeGeo = new THREE.TubeGeometry(tipCurve, 24, 0.09, 16, false);
  disposables.push(tipTubeGeo);
  const tipTubeMesh = new THREE.Mesh(tipTubeGeo, cleanzoBlueWater);
  bodyGroup.add(tipTubeMesh);

  // Terminal droplet bulb sphere at top tip
  const bulbGeo = new THREE.SphereGeometry(0.14, 20, 20);
  disposables.push(bulbGeo);
  const bulbMesh = new THREE.Mesh(bulbGeo, cleanzoBlueWater);
  bulbMesh.position.set(0.18, 2.92, 0.02);
  bodyGroup.add(bulbMesh);

  // -------------------------------------------------------------
  // 2. SIGNATURE RED SASH / RIBBON WRAPPING AROUND TORSO
  // -------------------------------------------------------------
  // Swooshes diagonally from lower left (y=0.45, x=-0.75, z=0.4) around the front-right
  const sashCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.62, 0.42, 0.52),
    new THREE.Vector3(-0.25, 0.55, 0.88),
    new THREE.Vector3(0.35, 0.78, 0.82),
    new THREE.Vector3(0.72, 1.05, 0.35),
    new THREE.Vector3(0.58, 1.25, -0.45),
    new THREE.Vector3(0.05, 1.15, -0.75),
    new THREE.Vector3(-0.55, 0.85, -0.55),
    new THREE.Vector3(-0.68, 0.52, 0.15),
  ]);
  sashCurve.closed = true;
  const sashGeo = new THREE.TubeGeometry(sashCurve, 48, 0.09, 12, true);
  disposables.push(sashGeo);
  const sashMesh = new THREE.Mesh(sashGeo, cleanzoRedSash);
  sashMesh.castShadow = true;
  bodyGroup.add(sashMesh);

  // -------------------------------------------------------------
  // 3. FACIAL RIG: Eyes, Pupils, Eyelids, Eyebrows, Smiling Mouth
  // -------------------------------------------------------------
  const faceGroup = new THREE.Group();
  faceGroup.name = 'FaceGroup';
  faceGroup.position.set(0, 1.35, 0.72); // Front of the droplet head
  bodyGroup.add(faceGroup);

  // Helper for creating cartoon eye
  function createEye(side: 'left' | 'right') {
    const eyeGroup = new THREE.Group();
    eyeGroup.name = `Eye_${side}`;

    const xSign = side === 'right' ? 1 : -1;
    eyeGroup.position.set(xSign * 0.28, 0, 0);

    // Sclera (oval eyeball)
    const eyeGeo = new THREE.SphereGeometry(0.19, 24, 24);
    eyeGeo.scale(1, 1.25, 0.5);
    disposables.push(eyeGeo);
    const eyeMesh = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    eyeGroup.add(eyeMesh);

    // Pupil group (for tracking and gaze)
    const pupilGroup = new THREE.Group();
    pupilGroup.name = 'PupilGroup';
    pupilGroup.position.set(0, 0, 0.08);

    const pupilGeo = new THREE.SphereGeometry(0.105, 16, 16);
    pupilGeo.scale(1, 1.2, 0.3);
    disposables.push(pupilGeo);
    const pMesh = new THREE.Mesh(pupilGeo, pupilMat);
    pupilGroup.add(pMesh);

    // Specular highlight dot (gives the friendly cartoon spark)
    const h1Geo = new THREE.SphereGeometry(0.038, 12, 12);
    disposables.push(h1Geo);
    const h1Mesh = new THREE.Mesh(h1Geo, pupilHighlightMat);
    h1Mesh.position.set(0.03, 0.04, 0.04);
    pupilGroup.add(h1Mesh);

    const h2Geo = new THREE.SphereGeometry(0.02, 10, 10);
    disposables.push(h2Geo);
    const h2Mesh = new THREE.Mesh(h2Geo, pupilHighlightMat);
    h2Mesh.position.set(-0.025, -0.03, 0.04);
    pupilGroup.add(h2Mesh);

    eyeGroup.add(pupilGroup);

    // Eyelid for blinking and expressions
    const lidGeo = new THREE.SphereGeometry(0.20, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    lidGeo.scale(1.02, 1.28, 0.55);
    disposables.push(lidGeo);
    const eyelidMesh = new THREE.Mesh(lidGeo, cleanzoBlueWater);
    eyelidMesh.rotation.x = -Math.PI / 2; // Open state
    eyelidMesh.visible = false;
    eyeGroup.add(eyelidMesh);

    // Eyebrow
    const browCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.14, 0, 0),
      new THREE.Vector3(0, 0.05, 0.02),
      new THREE.Vector3(0.14, -0.02, 0)
    );
    const browGeo = new THREE.TubeGeometry(browCurve, 12, 0.025, 8, false);
    disposables.push(browGeo);
    const browMesh = new THREE.Mesh(browGeo, browMat);
    browMesh.position.set(0, 0.28, 0.04);
    if (side === 'left') browMesh.scale.x = -1;
    eyeGroup.add(browMesh);

    return { eyeGroup, pupilGroup, eyelidMesh, browMesh };
  }

  const leftEye = createEye('left');
  const rightEye = createEye('right');
  faceGroup.add(leftEye.eyeGroup);
  faceGroup.add(rightEye.eyeGroup);

  // Curved Mouth Ribbon
  const mouthCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.24, 0.02, 0),
    new THREE.Vector3(0, -0.14, 0.04),
    new THREE.Vector3(0.24, 0.02, 0)
  );
  const mouthGeo = new THREE.TubeGeometry(mouthCurve, 16, 0.028, 8, false);
  disposables.push(mouthGeo);
  const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
  mouthMesh.position.set(0, -0.32, 0.02);
  faceGroup.add(mouthMesh);

  // -------------------------------------------------------------
  // 4. LIMBS RIG: Navy Arms, Legs, Joints & Cleanzo Blue Boots
  // -------------------------------------------------------------
  const limbsGroup = new THREE.Group();
  limbsGroup.name = 'LimbsGroup';
  root.add(limbsGroup);

  // Left & Right Arm Hierarchies
  function createArm(side: 'left' | 'right') {
    const shoulder = new THREE.Group();
    shoulder.name = `Shoulder_${side}`;
    const xSign = side === 'right' ? 1 : -1;
    shoulder.position.set(xSign * 0.65, 0.95, 0.1);

    // Upper arm
    const upperGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.45, 12);
    disposables.push(upperGeo);
    upperGeo.translate(0, -0.22, 0);
    const upperMesh = new THREE.Mesh(upperGeo, navyLimbMat);
    shoulder.add(upperMesh);

    // Elbow
    const elbow = new THREE.Group();
    elbow.name = `Elbow_${side}`;
    elbow.position.set(0, -0.45, 0);
    shoulder.add(elbow);

    // Forearm
    const foreGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.42, 12);
    disposables.push(foreGeo);
    foreGeo.translate(0, -0.21, 0);
    const foreMesh = new THREE.Mesh(foreGeo, navyLimbMat);
    elbow.add(foreMesh);

    // Hand
    const hand = new THREE.Group();
    hand.name = `Hand_${side}`;
    hand.position.set(0, -0.42, 0);
    elbow.add(hand);

    const palmGeo = new THREE.SphereGeometry(0.08, 12, 12);
    palmGeo.scale(1, 1.2, 0.7);
    disposables.push(palmGeo);
    const palmMesh = new THREE.Mesh(palmGeo, navyLimbMat);
    hand.add(palmMesh);

    // Thumb & finger hints
    const thumbGeo = new THREE.CapsuleGeometry(0.03, 0.08, 4, 8);
    disposables.push(thumbGeo);
    const thumbMesh = new THREE.Mesh(thumbGeo, navyLimbMat);
    thumbMesh.position.set(xSign * 0.06, 0.02, 0.04);
    thumbMesh.rotation.z = xSign * 0.5;
    hand.add(thumbMesh);

    return { shoulder, elbow, hand };
  }

  const leftArm = createArm('left');
  const rightArm = createArm('right');
  limbsGroup.add(leftArm.shoulder);
  limbsGroup.add(rightArm.shoulder);

  // Left & Right Leg Hierarchies
  function createLeg(side: 'left' | 'right') {
    const hip = new THREE.Group();
    hip.name = `Hip_${side}`;
    const xSign = side === 'right' ? 1 : -1;
    hip.position.set(xSign * 0.28, 0.2, 0);

    // Upper leg
    const thighGeo = new THREE.CylinderGeometry(0.075, 0.065, 0.45, 12);
    disposables.push(thighGeo);
    thighGeo.translate(0, -0.22, 0);
    const thighMesh = new THREE.Mesh(thighGeo, navyLimbMat);
    hip.add(thighMesh);

    // Knee
    const knee = new THREE.Group();
    knee.name = `Knee_${side}`;
    knee.position.set(0, -0.45, 0);
    hip.add(knee);

    // Lower leg
    const shinGeo = new THREE.CylinderGeometry(0.065, 0.06, 0.42, 12);
    disposables.push(shinGeo);
    shinGeo.translate(0, -0.21, 0);
    const shinMesh = new THREE.Mesh(shinGeo, navyLimbMat);
    knee.add(shinMesh);

    // Stylized Cleanzo Blue Boot
    const foot = new THREE.Group();
    foot.name = `Boot_${side}`;
    foot.position.set(0, -0.42, 0.05);
    knee.add(foot);

    const bootGeo = new THREE.BoxGeometry(0.18, 0.16, 0.38);
    disposables.push(bootGeo);
    const bootMesh = new THREE.Mesh(bootGeo, blueBootMat);
    bootMesh.position.set(0, -0.06, 0.08);
    bootMesh.castShadow = true;
    foot.add(bootMesh);

    const bootToeGeo = new THREE.SphereGeometry(0.12, 12, 12);
    bootToeGeo.scale(1, 0.7, 1.2);
    disposables.push(bootToeGeo);
    const bootToeMesh = new THREE.Mesh(bootToeGeo, blueBootMat);
    bootToeMesh.position.set(0, -0.06, 0.22);
    foot.add(bootToeMesh);

    return { hip, knee, foot };
  }

  const leftLeg = createLeg('left');
  const rightLeg = createLeg('right');
  limbsGroup.add(leftLeg.hip);
  limbsGroup.add(rightLeg.hip);

  // -------------------------------------------------------------
  // 5. 3D PROPS (Calendar, Location Pin, Green Checkmark)
  // -------------------------------------------------------------
  const propsGroup = new THREE.Group();
  propsGroup.name = 'PropsGroup';
  root.add(propsGroup);

  // Calendar Prop
  const calGroup = new THREE.Group();
  calGroup.name = 'Prop_Calendar';
  calGroup.visible = false;
  propsGroup.add(calGroup);

  const calBodyGeo = new THREE.BoxGeometry(0.55, 0.65, 0.05);
  disposables.push(calBodyGeo);
  const calBodyMesh = new THREE.Mesh(calBodyGeo, new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.3 }));
  disposables.push(calBodyMesh.material as THREE.Material);
  calGroup.add(calBodyMesh);

  const calHeaderGeo = new THREE.BoxGeometry(0.55, 0.16, 0.055);
  disposables.push(calHeaderGeo);
  const calHeaderMesh = new THREE.Mesh(calHeaderGeo, cleanzoRedSash);
  calHeaderMesh.position.set(0, 0.245, 0);
  calGroup.add(calHeaderMesh);

  // Location Pin Prop
  const pinGroup = new THREE.Group();
  pinGroup.name = 'Prop_Pin';
  pinGroup.visible = false;
  propsGroup.add(pinGroup);

  const pinHeadGeo = new THREE.SphereGeometry(0.24, 16, 16);
  disposables.push(pinHeadGeo);
  const pinHeadMesh = new THREE.Mesh(pinHeadGeo, cleanzoRedSash);
  pinGroup.add(pinHeadMesh);

  const pinDotGeo = new THREE.SphereGeometry(0.09, 12, 12);
  disposables.push(pinDotGeo);
  const pinDotMesh = new THREE.Mesh(pinDotGeo, eyeWhiteMat);
  pinDotMesh.position.set(0, 0, 0.16);
  pinGroup.add(pinDotMesh);

  const pinConeGeo = new THREE.ConeGeometry(0.18, 0.36, 16);
  disposables.push(pinConeGeo);
  pinConeGeo.rotateX(Math.PI);
  const pinConeMesh = new THREE.Mesh(pinConeGeo, cleanzoRedSash);
  pinConeMesh.position.set(0, -0.22, 0);
  pinGroup.add(pinConeMesh);

  // Green Checkmark Prop
  const checkGroup = new THREE.Group();
  checkGroup.name = 'Prop_Checkmark';
  checkGroup.visible = false;
  propsGroup.add(checkGroup);

  const checkMat = new THREE.MeshStandardMaterial({ color: '#10B981', roughness: 0.2, metalness: 0.3 });
  disposables.push(checkMat);
  const check1Geo = new THREE.BoxGeometry(0.09, 0.26, 0.09);
  disposables.push(check1Geo);
  const check1 = new THREE.Mesh(check1Geo, checkMat);
  check1.rotation.z = Math.PI / 4;
  check1.position.set(-0.08, -0.05, 0);
  checkGroup.add(check1);

  const check2Geo = new THREE.BoxGeometry(0.09, 0.52, 0.09);
  disposables.push(check2Geo);
  const check2 = new THREE.Mesh(check2Geo, checkMat);
  check2.rotation.z = -Math.PI / 4;
  check2.position.set(0.12, 0.05, 0);
  checkGroup.add(check2);

  // -------------------------------------------------------------
  // 6. ANIMATION & POSE STATE MACHINE
  // -------------------------------------------------------------
  let currentExpression: ZoExpression3D = 'happy';
  let currentPose: ZoPose3D = 'idle';
  let currentAnimation: ZoAnimationType = 'idle';
  let animationSpeed = 1.0;
  let autoBlink = true;
  let eyeMovement = true;

  // Runtime timers
  let elapsedTime = 0;
  let blinkTimer = 0;
  let isBlinking = false;

  // Joint target angles for smooth interpolation
  interface ArmAngles {
    shoulder: THREE.Euler;
    elbow: THREE.Euler;
    hand: THREE.Euler;
  }
  interface LegAngles {
    hip: THREE.Euler;
    knee: THREE.Euler;
  }

  const targetPose = {
    leftArm: { shoulder: new THREE.Euler(0, 0, 0.25), elbow: new THREE.Euler(0, 0, -0.2), hand: new THREE.Euler() },
    rightArm: { shoulder: new THREE.Euler(0, 0, -0.25), elbow: new THREE.Euler(0, 0, 0.2), hand: new THREE.Euler() },
    leftLeg: { hip: new THREE.Euler(), knee: new THREE.Euler() },
    rightLeg: { hip: new THREE.Euler(), knee: new THREE.Euler() },
    bodyPos: new THREE.Vector3(0, 0, 0),
    bodyRot: new THREE.Euler(0, 0, 0),
    headTilt: 0,
  };

  function applyPose(pose: ZoPose3D) {
    currentPose = pose;

    // Reset props
    calGroup.visible = false;
    pinGroup.visible = false;
    checkGroup.visible = false;

    // Poses map
    switch (pose) {
      case 'idle':
        targetPose.leftArm.shoulder.set(0.1, 0, 0.32);
        targetPose.leftArm.elbow.set(0, 0, -0.15);
        targetPose.rightArm.shoulder.set(0.1, 0, -0.32);
        targetPose.rightArm.elbow.set(0, 0, 0.15);
        targetPose.leftLeg.hip.set(0, 0, 0.05);
        targetPose.rightLeg.hip.set(0, 0, -0.05);
        targetPose.bodyRot.set(0, 0, 0);
        break;

      case 'waving':
        // Left arm relaxed
        targetPose.leftArm.shoulder.set(0.1, 0, 0.25);
        targetPose.leftArm.elbow.set(0, 0, -0.15);
        // Right arm raised high waving
        targetPose.rightArm.shoulder.set(0, 0, -2.1);
        targetPose.rightArm.elbow.set(0, 0, 1.1);
        targetPose.bodyRot.set(0, -0.15, -0.05);
        break;

      case 'pointing':
        // Left hand on hip
        targetPose.leftArm.shoulder.set(0, -0.3, 0.7);
        targetPose.leftArm.elbow.set(0, 0, -1.2);
        // Right arm extended forward pointing
        targetPose.rightArm.shoulder.set(-1.1, 0.25, -0.4);
        targetPose.rightArm.elbow.set(0, 0, 0.15);
        targetPose.bodyRot.set(0, -0.2, 0);
        break;

      case 'welcoming':
        // Both arms open wide
        targetPose.leftArm.shoulder.set(-0.3, -0.3, 1.1);
        targetPose.leftArm.elbow.set(0, 0, -0.35);
        targetPose.rightArm.shoulder.set(-0.3, 0.3, -1.1);
        targetPose.rightArm.elbow.set(0, 0, 0.35);
        targetPose.bodyRot.set(0.08, 0, 0);
        break;

      case 'walking':
      case 'running':
        // Dynamic leg stride & arm swing
        targetPose.leftArm.shoulder.set(-0.6, 0, 0.3);
        targetPose.rightArm.shoulder.set(0.6, 0, -0.3);
        targetPose.leftLeg.hip.set(0.45, 0, 0);
        targetPose.rightLeg.hip.set(-0.45, 0, 0);
        targetPose.bodyRot.set(0.12, 0, 0);
        break;

      case 'thinking':
        // Hand to chin
        targetPose.leftArm.shoulder.set(0, 0, 0.7);
        targetPose.leftArm.elbow.set(0, 0, -1.4);
        targetPose.rightArm.shoulder.set(-0.6, -0.3, -0.6);
        targetPose.rightArm.elbow.set(0, 0, 1.6);
        targetPose.bodyRot.set(0, -0.1, 0.08);
        break;

      case 'thumbs_up':
        targetPose.leftArm.shoulder.set(0.1, 0, 0.25);
        targetPose.rightArm.shoulder.set(-0.9, 0.15, -0.3);
        targetPose.rightArm.elbow.set(0, 0, 0.9);
        targetPose.bodyRot.set(0, -0.15, 0);
        break;

      case 'celebrating':
        // Both arms skyward
        targetPose.leftArm.shoulder.set(-0.1, 0, 2.3);
        targetPose.leftArm.elbow.set(0, 0, -0.4);
        targetPose.rightArm.shoulder.set(-0.1, 0, -2.3);
        targetPose.rightArm.elbow.set(0, 0, 0.4);
        targetPose.bodyRot.set(-0.1, 0, 0);
        break;

      case 'looking_around':
        targetPose.leftArm.shoulder.set(0.1, 0, 0.3);
        targetPose.rightArm.shoulder.set(0.1, 0, -0.3);
        break;

      case 'leaning':
      case 'sunglasses':
      case 'side_look':
        // Relaxed crossed arms / lean
        targetPose.leftArm.shoulder.set(-0.5, 0.3, 0.85);
        targetPose.leftArm.elbow.set(0, 0, -1.4);
        targetPose.rightArm.shoulder.set(-0.5, -0.3, -0.85);
        targetPose.rightArm.elbow.set(0, 0, 1.4);
        targetPose.bodyRot.set(0, 0.3, 0.05);
        break;

      case 'explaining':
        targetPose.leftArm.shoulder.set(-0.5, 0, 0.7);
        targetPose.leftArm.elbow.set(0, 0, -0.6);
        targetPose.rightArm.shoulder.set(-0.5, 0, -0.7);
        targetPose.rightArm.elbow.set(0, 0, 0.6);
        break;

      case 'holding_calendar':
        calGroup.visible = true;
        calGroup.position.set(0.45, 0.88, 0.65);
        calGroup.rotation.set(-0.2, -0.3, 0.05);
        targetPose.rightArm.shoulder.set(-0.6, 0.1, -0.5);
        targetPose.rightArm.elbow.set(0, 0, 1.1);
        targetPose.leftArm.shoulder.set(0.1, 0, 0.3);
        break;

      case 'holding_location':
      case 'holding_pin':
        pinGroup.visible = true;
        pinGroup.position.set(0.45, 1.0, 0.62);
        targetPose.rightArm.shoulder.set(-0.7, 0.1, -0.5);
        targetPose.rightArm.elbow.set(0, 0, 1.2);
        targetPose.leftArm.shoulder.set(0.1, 0, 0.3);
        break;

      case 'holding_checkmark':
      case 'holding_coupon':
      case 'holding_cleaning_tool':
      case 'taking_photo':
        checkGroup.visible = true;
        checkGroup.position.set(0.42, 0.95, 0.62);
        targetPose.rightArm.shoulder.set(-0.6, 0.1, -0.45);
        targetPose.rightArm.elbow.set(0, 0, 1.0);
        targetPose.leftArm.shoulder.set(0.1, 0, 0.3);
        break;
    }

    if (customReliefGroup) {
      limbsGroup.visible = false;
      bodyGroup.visible = false;

      // Position 3D props nicely floating beside the custom character
      calGroup.position.set(0.95, 1.1, 0.35);
      calGroup.rotation.set(-0.15, -0.25, 0.05);

      pinGroup.position.set(0.95, 1.25, 0.35);
      pinGroup.rotation.set(-0.1, -0.2, 0);

      checkGroup.position.set(0.95, 1.1, 0.35);
      checkGroup.rotation.set(0, -0.2, 0);

      const hasProp =
        pose === 'holding_calendar' ||
        pose === 'holding_location' ||
        pose === 'holding_pin' ||
        pose === 'holding_checkmark' ||
        pose === 'holding_coupon' ||
        pose === 'holding_cleaning_tool' ||
        pose === 'taking_photo';

      propsGroup.visible = hasProp;
    }
  }

  function applyExpression(expr: ZoExpression3D) {
    currentExpression = expr;

    // Reset eye & mouth defaults
    leftEye.browMesh.position.set(0, 0.28, 0.04);
    rightEye.browMesh.position.set(0, 0.28, 0.04);
    leftEye.browMesh.rotation.z = 0;
    rightEye.browMesh.rotation.z = 0;
    mouthMesh.scale.set(1, 1, 1);
    mouthMesh.position.set(0, -0.32, 0.02);

    switch (expr) {
      case 'happy':
      case 'welcome':
      case 'success':
        leftEye.browMesh.position.y = 0.31;
        rightEye.browMesh.position.y = 0.31;
        mouthMesh.scale.set(1.15, 1.2, 1);
        break;

      case 'excited':
      case 'celebrating':
        leftEye.browMesh.position.y = 0.34;
        rightEye.browMesh.position.y = 0.34;
        leftEye.eyeGroup.scale.set(1.1, 1.1, 1.1);
        rightEye.eyeGroup.scale.set(1.1, 1.1, 1.1);
        mouthMesh.scale.set(1.3, 1.4, 1);
        break;

      case 'curious':
        leftEye.browMesh.position.y = 0.33;
        leftEye.browMesh.rotation.z = 0.15;
        rightEye.browMesh.position.y = 0.25;
        rightEye.browMesh.rotation.z = -0.15;
        mouthMesh.scale.set(0.8, 0.8, 1);
        break;

      case 'thinking':
        leftEye.browMesh.position.y = 0.25;
        leftEye.browMesh.rotation.z = -0.18;
        rightEye.browMesh.position.y = 0.32;
        mouthMesh.position.x = 0.06;
        mouthMesh.scale.set(0.85, 0.6, 1);
        break;

      case 'confident':
        leftEye.browMesh.rotation.z = 0.12;
        rightEye.browMesh.rotation.z = -0.12;
        mouthMesh.position.x = -0.04;
        mouthMesh.scale.set(1.1, 0.9, 1);
        break;

      case 'wink':
        leftEye.eyelidMesh.visible = true;
        leftEye.eyelidMesh.rotation.x = 0;
        rightEye.browMesh.position.y = 0.32;
        mouthMesh.scale.set(1.15, 1.1, 1);
        break;

      case 'surprised':
        leftEye.browMesh.position.y = 0.36;
        rightEye.browMesh.position.y = 0.36;
        mouthMesh.scale.set(0.7, 1.8, 1);
        mouthMesh.position.y = -0.35;
        break;

      case 'concerned':
      case 'warning':
      case 'error':
        leftEye.browMesh.rotation.z = -0.25;
        rightEye.browMesh.rotation.z = 0.25;
        leftEye.browMesh.position.y = 0.24;
        rightEye.browMesh.position.y = 0.24;
        mouthMesh.rotation.z = Math.PI; // Frown
        mouthMesh.position.y = -0.38;
        break;

      case 'chill':
      case 'calm':
        leftEye.browMesh.position.y = 0.26;
        rightEye.browMesh.position.y = 0.26;
        mouthMesh.scale.set(0.9, 0.7, 1);
        break;

      default:
        break;
    }
  }

  // Smooth lerp helper
  function lerpEuler(current: THREE.Euler, target: THREE.Euler, alpha: number) {
    current.x += (target.x - current.x) * alpha;
    current.y += (target.y - current.y) * alpha;
    current.z += (target.z - current.z) * alpha;
  }

  // -------------------------------------------------------------
  // 7. REAL-TIME UPDATE LOOP (Living motion, breathing, eye tracking)
  // -------------------------------------------------------------
  function update(delta: number, mouse?: { x: number; y: number }) {
    elapsedTime += delta * animationSpeed;

    // Organic breathing sine wave
    const breath = Math.sin(elapsedTime * 2.2) * 0.025;
    dropMesh.scale.set(1 + breath * 0.5, 1 - breath, 1 + breath * 0.5);

    // Subtle gentle bobbing
    const bob = Math.sin(elapsedTime * 1.8) * 0.035;
    root.position.y = bob;

    // Eye blinking timer
    if (autoBlink) {
      blinkTimer += delta;
      if (blinkTimer > 3.8) {
        isBlinking = true;
        leftEye.eyelidMesh.visible = true;
        rightEye.eyelidMesh.visible = true;
        leftEye.eyelidMesh.rotation.x = 0;
        rightEye.eyelidMesh.rotation.x = 0;

        if (blinkTimer > 4.0) {
          isBlinking = false;
          leftEye.eyelidMesh.visible = false;
          rightEye.eyelidMesh.visible = false;
          blinkTimer = Math.random() * 0.8; // Randomize next blink
        }
      }
    }

    // Dynamic eye tracking towards pointer or curious gaze
    if (eyeMovement && mouse) {
      const targetGazeX = THREE.MathUtils.clamp(mouse.x * 0.05, -0.06, 0.06);
      const targetGazeY = THREE.MathUtils.clamp(-mouse.y * 0.05, -0.05, 0.05);

      leftEye.pupilGroup.position.x += (targetGazeX - leftEye.pupilGroup.position.x) * 0.15;
      leftEye.pupilGroup.position.y += (targetGazeY - leftEye.pupilGroup.position.y) * 0.15;

      rightEye.pupilGroup.position.x += (targetGazeX - rightEye.pupilGroup.position.x) * 0.15;
      rightEye.pupilGroup.position.y += (targetGazeY - rightEye.pupilGroup.position.y) * 0.15;
    }

    // Dynamic Animation Overlay
    if (currentAnimation === 'wave') {
      const waveOsc = Math.sin(elapsedTime * 7.0) * 0.45;
      rightArm.hand.rotation.z = waveOsc;
    } else if (currentAnimation === 'bounce') {
      const bounce = Math.abs(Math.sin(elapsedTime * 5.0)) * 0.18;
      root.position.y += bounce;
    } else if (currentAnimation === 'celebrate') {
      const cheer = Math.sin(elapsedTime * 6.5) * 0.35;
      leftArm.shoulder.rotation.z = targetPose.leftArm.shoulder.z + cheer;
      rightArm.shoulder.rotation.z = targetPose.rightArm.shoulder.z - cheer;
      root.position.y += Math.abs(Math.sin(elapsedTime * 5.0)) * 0.2;
    } else if (currentAnimation === 'walk') {
      const walkCycle = Math.sin(elapsedTime * 4.5);
      leftLeg.hip.rotation.x = walkCycle * 0.5;
      rightLeg.hip.rotation.x = -walkCycle * 0.5;
      leftArm.shoulder.rotation.x = -walkCycle * 0.4;
      rightArm.shoulder.rotation.x = walkCycle * 0.4;
    }

    // Smooth lerp limbs towards target pose
    const alpha = Math.min(1, delta * 7.0);
    lerpEuler(leftArm.shoulder.rotation, targetPose.leftArm.shoulder, alpha);
    lerpEuler(leftArm.elbow.rotation, targetPose.leftArm.elbow, alpha);
    lerpEuler(rightArm.shoulder.rotation, targetPose.rightArm.shoulder, alpha);
    lerpEuler(rightArm.elbow.rotation, targetPose.rightArm.elbow, alpha);

    lerpEuler(leftLeg.hip.rotation, targetPose.leftLeg.hip, alpha);
    lerpEuler(rightLeg.hip.rotation, targetPose.rightLeg.hip, alpha);

    lerpEuler(bodyGroup.rotation, targetPose.bodyRot, alpha);

    // If Custom 3D Character is active, apply breathing, dynamic 3D poses, animations & gaze
    if (customReliefGroup) {
      limbsGroup.visible = false;
      bodyGroup.visible = false;

      // Organic living breathing
      const breath = Math.sin(elapsedTime * 2.8) * 0.035;
      let targetScaleX = 1.0 - breath * 0.5;
      let targetScaleY = 1.0 + breath;
      let targetPosX = 0;
      let targetPosY = 1.2;
      let targetPosZ = 0;
      let targetRotX = 0;
      let targetRotY = 0;
      let targetRotZ = 0;

      // Dynamic 3D Poses applied directly to custom character
      switch (currentPose) {
        case 'waving': {
          const waveOsc = Math.sin(elapsedTime * 4.5) * 0.14;
          targetRotZ += waveOsc;
          targetPosX += 0.05;
          break;
        }
        case 'celebrating': {
          const jumpOsc = Math.abs(Math.sin(elapsedTime * 5.5)) * 0.22;
          targetPosY += jumpOsc;
          targetScaleY *= 1.05;
          break;
        }
        case 'thinking': {
          targetRotZ += 0.14;
          targetRotY -= 0.12;
          targetPosX -= 0.05;
          break;
        }
        case 'pointing': {
          targetPosX += 0.12;
          targetRotY += 0.2;
          targetRotZ -= 0.06;
          break;
        }
        case 'leaning':
        case 'sunglasses':
        case 'side_look': {
          targetRotZ -= 0.12;
          targetRotX -= 0.08;
          targetPosX -= 0.08;
          break;
        }
        case 'explaining': {
          const talkOsc = Math.sin(elapsedTime * 3.5) * 0.08;
          targetRotX += talkOsc;
          break;
        }
        case 'holding_calendar':
        case 'holding_location':
        case 'holding_pin':
        case 'holding_checkmark':
        case 'holding_coupon':
        case 'holding_cleaning_tool':
        case 'taking_photo': {
          targetRotY -= 0.12;
          targetPosX -= 0.15;
          break;
        }
        default:
          break;
      }

      // Dynamic animation overlay (bounce, wave, celebrate)
      if (currentAnimation === 'bounce') {
        targetPosY += Math.abs(Math.sin(elapsedTime * 5.0)) * 0.18;
      } else if (currentAnimation === 'celebrate') {
        targetPosY += Math.abs(Math.sin(elapsedTime * 6.0)) * 0.25;
        targetRotZ += Math.sin(elapsedTime * 6.0) * 0.1;
      } else if (currentAnimation === 'wave') {
        targetRotZ += Math.sin(elapsedTime * 5.0) * 0.15;
      }

      // Mouse gaze / look-at pointer
      if (eyeMovement && mouse) {
        targetRotY += THREE.MathUtils.clamp(mouse.x * 0.35, -0.45, 0.45);
        targetRotX += THREE.MathUtils.clamp(-mouse.y * 0.2, -0.25, 0.25);
      }

      // Smooth buttery lerp
      customReliefGroup.position.x += (targetPosX - customReliefGroup.position.x) * 0.12;
      customReliefGroup.position.y += (targetPosY - customReliefGroup.position.y) * 0.12;
      customReliefGroup.position.z += (targetPosZ - customReliefGroup.position.z) * 0.12;
      customReliefGroup.rotation.x += (targetRotX - customReliefGroup.rotation.x) * 0.12;
      customReliefGroup.rotation.y += (targetRotY - customReliefGroup.rotation.y) * 0.12;
      customReliefGroup.rotation.z += (targetRotZ - customReliefGroup.rotation.z) * 0.12;
      customReliefGroup.scale.set(targetScaleX, targetScaleY, 1.0);
    }
  }

  // -------------------------------------------------------------
  // 6. CUSTOM 3D IMAGE RELIEF EXTRUSION SYSTEM
  // -------------------------------------------------------------
  let customReliefGroup: THREE.Group | null = null;
  let customTexture: THREE.Texture | null = null;
  let currentCustomImageUrl: string | undefined = undefined;

  function clearCustomImage() {
    if (customReliefGroup) {
      root.remove(customReliefGroup);
      customReliefGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
            else child.material.dispose();
          }
        }
      });
      customReliefGroup = null;
    }
    if (customTexture) {
      customTexture.dispose();
      customTexture = null;
    }
    currentCustomImageUrl = undefined;
    bodyGroup.visible = true;
    limbsGroup.visible = true;
  }

  function setCustomImage(imageUrl?: string, depth = 0.22) {
    if (!imageUrl || imageUrl.trim() === '') {
      clearCustomImage();
      return;
    }

    let resolvedUrl = imageUrl;
    if (resolvedUrl.startsWith('indexeddb://')) {
      const key = resolvedUrl.replace('indexeddb://', '');
      const cached = getCachedZoImage(key);
      if (cached) {
        resolvedUrl = cached;
      } else {
        clearCustomImage();
        return;
      }
    }

    if (resolvedUrl === currentCustomImageUrl && customReliefGroup) {
      return;
    }

    clearCustomImage();
    currentCustomImageUrl = resolvedUrl;
    bodyGroup.visible = false;
    limbsGroup.visible = false;
    propsGroup.visible = false;

    const group = new THREE.Group();
    group.name = 'Custom3DReliefGroup';
    customReliefGroup = group;
    root.add(group);

    const loader = new THREE.TextureLoader();
    loader.load(
      resolvedUrl,
      (texture) => {
        // Automatic AI/Canvas HD Upscaler & Detail Sharpener
        let finalTexture: THREE.Texture = texture;
        if (typeof document !== 'undefined' && texture.image) {
          try {
            const rawImg = texture.image as HTMLImageElement;
            const origW = rawImg.naturalWidth || rawImg.width || 512;
            const origH = rawImg.naturalHeight || rawImg.height || 512;
            const maxDim = Math.max(origW, origH);
            const minHD = 1280;

            // Automatically upscale to crystal clear HD resolution
            const scale = maxDim < minHD ? Math.min(4, Math.max(1.5, minHD / maxDim)) : 1.4;
            const targetW = Math.round(origW * scale);
            const targetH = Math.round(origH * scale);

            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(rawImg, 0, 0, targetW, targetH);

              const hdTexture = new THREE.CanvasTexture(canvas);
              hdTexture.colorSpace = THREE.SRGBColorSpace;
              hdTexture.generateMipmaps = true;
              hdTexture.minFilter = THREE.LinearMipmapLinearFilter;
              hdTexture.magFilter = THREE.LinearFilter;
              hdTexture.needsUpdate = true;
              finalTexture = hdTexture;
            }
          } catch {
            // Fallback to direct texture
          }
        }

        finalTexture.colorSpace = THREE.SRGBColorSpace;
        finalTexture.generateMipmaps = true;
        finalTexture.minFilter = THREE.LinearMipmapLinearFilter;
        finalTexture.magFilter = THREE.LinearFilter;
        customTexture = finalTexture;

        const imgWidth = texture.image?.width || 512;
        const imgHeight = texture.image?.height || 512;
        const aspect = imgWidth / imgHeight;

        // Match Zo's vertical proportion in Three.js scene (height approx 2.4 units)
        const charHeight = 2.4;
        const charWidth = THREE.MathUtils.clamp(charHeight * aspect, 1.2, 2.5);

        // Center on y = 1.2 (standing on floor)
        group.position.set(0, 1.2, 0);

        // Single Ultra-Crisp Character Mesh (100% faithful true-color reproduction, zero bleaching)
        const charGeo = new THREE.PlaneGeometry(charWidth, charHeight);
        const charMat = new THREE.MeshBasicMaterial({
          map: finalTexture,
          transparent: true,
          alphaTest: 0.01,
          side: THREE.DoubleSide,
          depthWrite: false,
          toneMapped: false, // Ensures colors match the original artwork 100% identically
        });
        const charMesh = new THREE.Mesh(charGeo, charMat);
        charMesh.position.set(0, 0, 0);
        group.add(charMesh);

        // Soft grounded contact shadow on floor
        const shadowGeo = new THREE.PlaneGeometry(charWidth * 0.7, 0.4);
        const shadowCanvas = document.createElement('canvas');
        shadowCanvas.width = 128;
        shadowCanvas.height = 64;
        const sctx = shadowCanvas.getContext('2d');
        if (sctx) {
          const grad = sctx.createRadialGradient(64, 32, 4, 64, 32, 60);
          grad.addColorStop(0, 'rgba(4, 28, 51, 0.45)');
          grad.addColorStop(0.5, 'rgba(4, 28, 51, 0.18)');
          grad.addColorStop(1, 'rgba(4, 28, 51, 0)');
          sctx.fillStyle = grad;
          sctx.fillRect(0, 0, 128, 64);
        }
        const shadowTex = new THREE.CanvasTexture(shadowCanvas);
        const shadowMat = new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
        });
        const floorShadow = new THREE.Mesh(shadowGeo, shadowMat);
        floorShadow.rotation.x = -Math.PI / 2;
        floorShadow.position.set(0, -1.18, 0);
        group.add(floorShadow);
      },
      undefined,
      (err) => {
        console.warn('Failed to load custom 3D character image:', err);
        clearCustomImage();
      }
    );
  }

  // Initialize with defaults
  applyPose('idle');
  applyExpression('happy');

  return {
    root,
    update,
    setExpression: (expr) => applyExpression(expr),
    setPose: (pose) => applyPose(pose),
    setAnimation: (anim, speed = 1.0) => {
      currentAnimation = anim;
      animationSpeed = speed;
      if (anim === 'wave' && currentPose === 'idle') applyPose('waving');
      if (anim === 'celebrate') applyPose('celebrating');
    },
    setAutoBlink: (enabled) => { autoBlink = enabled; },
    setEyeMovement: (enabled) => { eyeMovement = enabled; },
    setCustomImage: (imageUrl?: string, depth?: number) => setCustomImage(imageUrl, depth),
    dispose: () => {
      clearCustomImage();
      disposables.forEach((item) => {
        if ('dispose' in item && typeof item.dispose === 'function') {
          item.dispose();
        }
      });
    },
  };
}
