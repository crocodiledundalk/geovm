'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function GlobeMesh() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      canvas: document.createElement('canvas')
    });
    
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Create globe
    const globeGeometry = new THREE.SphereGeometry(6, 32, 32);
    const globeMaterial = new THREE.MeshPhongMaterial({
      color: 0x1a1a1a,
      wireframe: true,
      transparent: false,
      opacity: 1,
      wireframeLinewidth: 3
    });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    scene.add(globe);

    // Create triangular mesh with more detail
    const meshGeometry = new THREE.IcosahedronGeometry(6.6, 3);
    const meshMaterial = new THREE.MeshPhongMaterial({
      color: 0x14b8a6, // teal-500 color
      wireframe: true,
      transparent: false,
      opacity: 1,
      wireframeLinewidth: 3,
      emissive: 0x14b8a6,
      emissiveIntensity: 0.2
    });
    const mesh = new THREE.Mesh(meshGeometry, meshMaterial);
    scene.add(mesh);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1.5);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Position camera
    camera.position.z = 13;

    // Animation
    const animate = () => {
      requestAnimationFrame(animate);
      
      globe.rotation.y += 0.002;
      mesh.rotation.y += 0.001;
      
      renderer.render(scene, camera);
    };

    // Handle window resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeChild(renderer.domElement);
      scene.remove(globe, mesh, ambientLight, pointLight);
      globeGeometry.dispose();
      globeMaterial.dispose();
      meshGeometry.dispose();
      meshMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-[500px] bg-transparent relative"
      style={{ minHeight: '500px' }}
    />
  );
} 