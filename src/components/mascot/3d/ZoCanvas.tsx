'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { createZo3DCharacter, Zo3DInstance } from '@/lib/zo/Zo3DModel';
import { ZoExpression3D, ZoPose3D, ZoAnimationType } from '@/types/zoStudioTypes';
import { getZoImage, getCachedZoImage } from '@/lib/zo/zoImageStorage';

export interface ZoCanvasProps {
  expression?: ZoExpression3D;
  pose?: ZoPose3D;
  animation?: ZoAnimationType;
  animationSpeed?: number;
  autoBlink?: boolean;
  eyeMovement?: boolean;
  scale?: number;
  rotationY?: number; // in degrees
  opacity?: number;
  shadow?: boolean;
  glow?: boolean;
  allowOrbit?: boolean;
  lookAtCursor?: boolean;
  customImage?: string;
  customImageDepth?: number;
  className?: string;
  onCharacterClick?: () => void;
}

export function ZoCanvas({
  expression = 'happy',
  pose = 'idle',
  animation = 'idle',
  animationSpeed = 1.0,
  autoBlink = true,
  eyeMovement = true,
  scale = 1.0,
  rotationY = 0,
  opacity = 1.0,
  shadow = true,
  glow = true,
  allowOrbit = false,
  lookAtCursor = true,
  customImage,
  customImageDepth = 0.22,
  className = '',
  onCharacterClick,
}: ZoCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoInstanceRef = useRef<Zo3DInstance | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const manualRotYRef = useRef(0);

  const [hasWebGL, setHasWebGL] = useState(true);

  // Check WebGL availability
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
      }
    } catch {
      setHasWebGL(false);
    }
  }, []);

  const [resolvedCustomImage, setResolvedCustomImage] = useState<string | undefined>(() => {
    if (!customImage) {
      return getCachedZoImage('zo_master_custom_image') || undefined;
    }
    if (customImage.startsWith('indexeddb://')) {
      const key = customImage.replace('indexeddb://', '');
      return getCachedZoImage(key) || getCachedZoImage('zo_master_custom_image') || undefined;
    }
    return customImage;
  });

  // Resolve custom image if indexeddb reference or master fallback
  useEffect(() => {
    if (!customImage) {
      const master = getCachedZoImage('zo_master_custom_image');
      setResolvedCustomImage(master || undefined);
      return;
    }
    if (customImage.startsWith('indexeddb://')) {
      const key = customImage.replace('indexeddb://', '');
      const cached = getCachedZoImage(key) || getCachedZoImage('zo_master_custom_image');
      if (cached) {
        setResolvedCustomImage(cached);
      } else {
        getZoImage(key).then((data) => {
          if (data) {
            setResolvedCustomImage(data);
          } else {
            const master = getCachedZoImage('zo_master_custom_image');
            if (master) setResolvedCustomImage(master);
          }
        });
      }
    } else {
      setResolvedCustomImage(customImage);
    }
  }, [customImage]);

  // Update character state whenever props change
  useEffect(() => {
    if (zoInstanceRef.current) {
      zoInstanceRef.current.setExpression(expression);
      zoInstanceRef.current.setPose(pose);
      zoInstanceRef.current.setAnimation(animation, animationSpeed);
      zoInstanceRef.current.setAutoBlink(autoBlink);
      zoInstanceRef.current.setEyeMovement(eyeMovement);
      zoInstanceRef.current.setCustomImage(resolvedCustomImage, customImageDepth);
    }
  }, [expression, pose, animation, animationSpeed, autoBlink, eyeMovement, resolvedCustomImage, customImageDepth]);

  // Main Three.js Scene Setup
  useEffect(() => {
    if (!hasWebGL || !canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;

    // Dimensions
    const width = container.clientWidth || 240;
    const height = container.clientHeight || 280;

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      renderer.shadowMap.enabled = shadow;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
    } catch {
      setHasWebGL(false);
      return;
    }

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    // Center camera on Zo's midsection
    camera.position.set(0, 1.4, 4.4);
    camera.lookAt(0, 1.35, 0);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    // Key front light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
    keyLight.position.set(2.5, 4, 3.5);
    keyLight.castShadow = shadow;
    if (shadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.001;
    }
    scene.add(keyLight);

    // Fresh Aqua fill light (accentuates water clarity)
    const fillLight = new THREE.DirectionalLight(0x25b8e6, 0.7);
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);

    // Cleanzo Blue rim light (makes glossy edges of the droplet silhouette shine)
    const rimLight = new THREE.DirectionalLight(0x0866c6, 1.1);
    rimLight.position.set(0, 3, -3.5);
    scene.add(rimLight);

    // Soft ground shadow disk (Cleanzo Navy)
    const shadowGeo = new THREE.PlaneGeometry(1.6, 1.6);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x07345c,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const groundShadow = new THREE.Mesh(shadowGeo, shadowMat);
    groundShadow.rotation.x = -Math.PI / 2;
    groundShadow.position.y = -0.36;
    scene.add(groundShadow);

    // Create 3D Zo Instance
    const zo = createZo3DCharacter();
    zoInstanceRef.current = zo;
    scene.add(zo.root);

    // Apply initial state
    zo.setExpression(expression);
    zo.setPose(pose);
    zo.setAnimation(animation, animationSpeed);
    zo.setAutoBlink(autoBlink);
    zo.setEyeMovement(eyeMovement);
    zo.setCustomImage(resolvedCustomImage, customImageDepth);

    // Animation Loop
    let animationFrameId: number;
    let lastTime = performance.now();
    let isVisible = true;

    const clock = new THREE.Clock();

    function renderLoop() {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(renderLoop);
        return;
      }

      const delta = Math.min(clock.getDelta(), 0.1);

      // Apply props to root
      if (zo) {
        zo.root.scale.setScalar(scale);
        // Base rotation + manual orbit drag
        const radY = (rotationY * Math.PI) / 180 + manualRotYRef.current;
        zo.root.rotation.y = radY;

        zo.update(delta, lookAtCursor ? mouseRef.current : undefined);
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(renderLoop);
    }

    renderLoop();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 240;
      const h = container.clientHeight || 280;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    // Intersection Observer to pause rendering offscreen
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting && !document.hidden;
        });
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(container);

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      zo.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      renderer.dispose();
      zoInstanceRef.current = null;
    };
  }, [hasWebGL, shadow]);

  // Pointer tracking & 360 orbit dragging
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    mouseRef.current = { x, y };

    if (allowOrbit && isDraggingRef.current) {
      const deltaX = e.clientX - prevMouseRef.current.x;
      manualRotYRef.current += deltaX * 0.015;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (allowOrbit) {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  if (!hasWebGL) {
    // Graceful SVG / Clean Fallback
    return (
      <div
        className={`relative flex items-center justify-center select-none ${className}`}
        style={{ opacity }}
        onClick={onCharacterClick}
      >
        <div className="w-28 h-36 relative flex items-center justify-center rounded-2xl bg-gradient-to-b from-[#0866C6]/20 to-[#0866C6]/5 border border-[#0866C6]/30 p-2">
          <div className="text-center">
            <div className="w-14 h-16 mx-auto rounded-full bg-[#0866C6] flex items-center justify-center shadow-lg relative overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-4 bg-[#F0444C] -rotate-12 transform" />
              <span className="text-white text-xl font-black relative z-10">ZO</span>
            </div>
            <span className="text-[11px] font-bold text-[#0866C6] dark:text-[#3894ec] mt-2 block">
              Cleanzo 3D
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative select-none touch-none ${allowOrbit ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${className}`}
      style={{ opacity }}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={onCharacterClick}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
      {glow && (
        <div
          className="absolute inset-0 pointer-events-none -z-10 rounded-full blur-2xl opacity-25"
          style={{ background: 'radial-gradient(circle, #0866C6 0%, transparent 70%)' }}
        />
      )}
    </div>
  );
}
