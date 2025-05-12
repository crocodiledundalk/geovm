'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function SplitGlobe() {
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

    // Create material
    const material = new THREE.MeshPhongMaterial({
      color: 0x14b8a6, // teal-500 color
      wireframe: true,
      transparent: false,
      opacity: 1
    });

    // Create west hemisphere
    const westGeometry = new THREE.SphereGeometry(6, 32, 32, 0, Math.PI, 0, Math.PI);
    const westHemisphere = new THREE.Mesh(westGeometry, material);
    westHemisphere.position.x = -4;
    scene.add(westHemisphere);

    // Create east hemisphere
    const eastGeometry = new THREE.SphereGeometry(6, 32, 32, Math.PI, Math.PI, 0, Math.PI);
    const eastHemisphere = new THREE.Mesh(eastGeometry, material);
    eastHemisphere.position.x = 4;
    eastHemisphere.rotation.y = Math.PI;
    scene.add(eastHemisphere);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1.2);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Position camera
    camera.position.z = 13;

    // Animation
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Rotate hemispheres in opposite directions around Y axis
      westHemisphere.rotation.y += 0.002;
      eastHemisphere.rotation.y -= 0.002;
      
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
      scene.remove(westHemisphere, eastHemisphere, ambientLight, pointLight);
      westGeometry.dispose();
      eastGeometry.dispose();
      material.dispose();
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