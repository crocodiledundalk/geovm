'use client';

import { StickyScroll } from "@/components/ui/sticky-scroll-reveal";
import { GlobeMesh } from "./GlobeMesh";
import { SplitGlobe } from "./SplitGlobe";
import { CodeEditorAnimation } from "./CodeEditorAnimation";





const explainerSteps = [
  {
    title: "Verifiable Trixel Mesh",
    subtitle: "Mapping the World, Verifiably",
    description: "GeoSVM's Verifiable Trixel Mesh (VTM) creates a precise digital grid for the entire globe. Starting with a base spherical structure (like an octahedron), it recursively subdivides into smaller, nearly equal triangular cells called 'trixels', forming a quad-tree hierarchy. This provides a universal, multi-resolution addressing system, allowing any geospatial data to be accurately pinpointed and efficiently queried at any scale, from global to local.",
    content: (
      <div className="h-full w-full flex items-center justify-center">
        <div className="w-full h-full">
          <GlobeMesh />
        </div>
      </div>
    )
  },
  {
    title: "Sierpinski-Merkle Trees",
    subtitle: "Cryptographic Truth for Location",
    description: "GeoSVM employs binary Merkle trees (a type of hash tree) to secure data within each VTM cell. Hashes of individual data pieces are paired and re-hashed, creating branches, until a single 'Merkle Root' is formed for that cell. This root acts as a unique cryptographic fingerprint. It allows anyone to efficiently verify the integrity and origin of specific data using a compact 'Merkle proof', without needing to download or process the entire dataset associated with the cell.",
    content: (
      <div className="h-full w-full flex items-center justify-center text-teal-500">
        <svg width="100%" height="100%" viewBox="0 0 1774 1536" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
          <path id="t" d="M 0 1 L .8660254 -.5 -.8660254 -.5 Z" fill="currentColor"/>
          <g id="d1">
            <use xlinkHref="#t" transform="matrix(0.5, 0, 0, 0.5, 0, 0.5)"/>
            <use xlinkHref="#t" transform="matrix(0.5, 0, 0, 0.5, 0.433013, -0.25)"/>
            <use xlinkHref="#t" transform="matrix(0.5, 0, 0, 0.5, -0.433013, -0.25)"/>
          </g>
          <g id="d2">
            <use xlinkHref="#d1" transform="matrix(0.5, 0, 0, 0.5, 0, 0.5)"/>
            <use xlinkHref="#d1" transform="matrix(0.5, 0, 0, 0.5, 0.433013, -0.25)"/>
            <use xlinkHref="#d1" transform="matrix(0.5, 0, 0, 0.5, -0.433013, -0.25)"/>
          </g>
          <g id="d3">
            <use xlinkHref="#d2" transform="matrix(0.5, 0, 0, 0.5, 0, 0.5)"/>
            <use xlinkHref="#d2" transform="matrix(0.5, 0, 0, 0.5, 0.433013, -0.25)"/>
            <use xlinkHref="#d2" transform="matrix(0.5, 0, 0, 0.5, -0.433013, -0.25)"/>
          </g>
          <g id="d4">
            <use xlinkHref="#d3" transform="matrix(0.5, 0, 0, 0.5, 0, 0.5)"/>
            <use xlinkHref="#d3" transform="matrix(0.5, 0, 0, 0.5, 0.433013, -0.25)"/>
            <use xlinkHref="#d3" transform="matrix(0.5, 0, 0, 0.5, -0.433013, -0.25)"/>
          </g>
          <g id="d5">
            <use xlinkHref="#d4" transform="matrix(0.5, 0, 0, 0.5, 0, 0.5)"/>
            <use xlinkHref="#d4" transform="matrix(0.5, 0, 0, 0.5, 0.433013, -0.25)"/>
            <use xlinkHref="#d4" transform="matrix(0.5, 0, 0, 0.5, -0.433013, -0.25)"/>
          </g>
          <g id="d6">
            <use xlinkHref="#d5" transform="matrix(0.5, 0, 0, 0.5, 0, 0.5)"/>
            <use xlinkHref="#d5" transform="matrix(0.5, 0, 0, 0.5, 0.433013, -0.25)"/>
            <use xlinkHref="#d5" transform="matrix(0.5, 0, 0, 0.5, -0.433013, -0.25)"/>
          </g>
          <g id="d7">
            <use xlinkHref="#d6" transform="matrix(.5 0 0 .5 0 .5)" />
            <use xlinkHref="#d6" transform="matrix(.5 0 0 .5 .43301270 -.25)" />
            <use xlinkHref="#d6" transform="matrix(.5 0 0 .5 -.43301270 -.25)" />
          </g>
          <g id="d8">
            <use xlinkHref="#d7" transform="matrix(.5 0 0 .5 0 .5)" />
            <use xlinkHref="#d7" transform="matrix(.5 0 0 .5 .43301270 -.25)" />
            <use xlinkHref="#d7" transform="matrix(.5 0 0 .5 -.43301270 -.25)" />
          </g>
          <g transform="matrix(1024, 0, 0, -1024, 886.81, 1024)">
            <use xlinkHref="#d8"/>
          </g>
        </svg>
      </div>
    )
  },
  {
    title: "Geosharding",
    subtitle: "Natural sub-divisions, lower latency",
    description: "GeoSVM achieves global scalability and rapid performance through GeoSharding. The network is intelligently partitioned into distinct geographic zones, or shards. Transactions and data queries are primarily processed by nodes within the relevant shard, significantly reducing data travel distance and network latency. This localized consensus and processing boosts overall throughput, enabling a responsive system for worldwide applications.",
    content: (
      <div className="h-full w-full flex items-center justify-center">
        <div className="w-full h-full">
          <SplitGlobe />
        </div>
      </div>
    )
  },
  {
    title: "Geo-Smart Contracts",
    subtitle: "Programmable Geospatial Value",
    description: "Leveraging a high-performance Solana Virtual Machine (SVM) based architecture, GeoSVM enables powerful 'Geo-Smart Contracts', typically written in efficient languages like Rust. These contracts can execute complex, automated geospatial logic directly using the VTM's verifiable data. Crucially, GeoVM is designed for interoperability; it provides standardized Merkle proofs allowing smart contracts on other major blockchains (e.g., EVM-compatible chains) to securely consume and act upon GeoVM's trusted location intelligence, paving the way for innovative geospatial capital markets and new data economies.",
    content: (
      <div className="h-full w-full flex items-center justify-center">
        <div className="w-full h-full">
          <CodeEditorAnimation />
        </div>
      </div>
    )
  }
];

export function ExplainerSection() {
  return (
    <section className="py-20" id="explainer">
      <div className="container mx-auto">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mt-12">
            How does GeoSVM Works?
          </h2>
          <p className="mx-auto max-w-8xl text-slate-400 md:text-xl">
            Discover the core technologies enabling decentralized geospatial computing.
          </p>
        </div>
        <StickyScroll content={explainerSteps} />
      </div>
    </section>
  );
} 