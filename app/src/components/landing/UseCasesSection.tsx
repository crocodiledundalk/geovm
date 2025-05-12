'use client';

import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { ExpandableCard } from "@/components/ui/expandable-card";

const useCases = [
  // DEPIN INFRASTRUCTURE
  {
    title: "Hierarchical Maps",
    category: "Depin Infrastructure",
    blurb: "Build decentralized, real-time maps with multi-resolution detail using crowdsourced location data.",
    body: "Create the next generation of mapping services that leverage GeoVM's hierarchical data structure to deliver the right level of detail exactly when needed. Enable crowd-sourced data collection from IoT devices, vehicles, and users to maintain up-to-date maps across any scale—from global navigation to indoor positioning. GeoVM's native verification allows map data to be trusted for critical applications from autonomous vehicles to emergency services."
  },
  {
    title: "Smart City Sensors",
    category: "Depin Infrastructure",
    blurb: "Deploy and manage urban sensor networks with secure, verifiable data across neighborhoods.",
    body: "Build applications that coordinate thousands of city-wide sensors while maintaining data integrity through GeoVM's cryptographic proofs. Deploy environmental monitoring, traffic analysis, noise pollution sensors, and public safety devices that share a common spatial indexing system. Enable local governments and communities to access verified sensor data at neighborhood or city-wide scales while maintaining precise source attribution."
  },
  {
    title: "5G Coverage",
    category: "Depin Infrastructure",
    blurb: "Create transparent, community-owned 5G networks with performance verification at any scale.",
    body: "Revolutionize telecommunications by enabling decentralized 5G infrastructure that's verified and rewarded based on actual coverage. Build networks where node operators earn rewards for providing service in specific trixel regions, with coverage metrics cryptographically verified through GeoVM. Create secondary markets where bandwidth futures can be traded based on forecasted demand in high-traffic areas."
  },
  {
    title: "Precision Agriculture",
    category: "Depin Infrastructure",
    blurb: "Connect farm sensors, drones, and equipment for data-driven cultivation at any scale.",
    body: "Transform agriculture with hyperlocal data precision while maintaining full-farm analytics. GeoVM enables the fusion of satellite imagery, drone data, and ground sensors into a coherent system where farm operators can zoom from individual plant health to regional growing conditions. Create yield prediction markets, optimal resource allocation systems, and verifiable sustainable farming certifications all using the same hierarchical data structure."
  },
  // ENVIRONMENT & SUSTAINABILITY
  {
    title: "Carbon Credits",
    category: "Environment & Sustainability",
    blurb: "Build transparent carbon removal markets with hierarchical verification from plot to planetary scale.",
    body: "Solve the transparency crisis in carbon markets by creating verifiable connections between physical sequestration projects and tokenized credits. GeoVM's hierarchical structure allows carbon measurement at the individual plot level while enabling aggregation to regional and global standards. Smart contracts can automate verification and issuance processes, while maintaining a cryptographic link between on-ground measurements and traded assets."
  },
  {
    title: "Watershed Management",
    category: "Environment & Sustainability",
    blurb: "Monitor and allocate water resources from individual streams to entire river basins.",
    body: "Create applications that track water quality, quantity and usage across natural watershed boundaries. GeoVM enables the efficient management of water sensor data from tributaries to major rivers, supporting allocation, conservation and quality monitoring. Build water rights markets that account for geographic relationships, with downstream dependencies automatically calculated from upstream activities."
  },
  {
    title: "Sustainable Energy",
    category: "Environment & Sustainability",
    blurb: "Create peer-to-peer energy trading networks optimized for local production and consumption.",
    body: "Build decentralized renewable energy grids where prosumers can trade excess production with neighbors or contribute to the wider grid. GeoVM's understanding of geographic proximity enables energy trading systems that minimize transmission loss and maximize grid stability. Create markets where energy value reflects both time and location, with automated settlement based on verifiable local production and consumption."
  },
  {
    title: "Biodiversity Credits",
    category: "Environment & Sustainability",
    blurb: "Enable verifiable biodiversity protection and restoration markets across ecosystems.",
    body: "Create new environmental markets by tracking and rewarding biodiversity conservation and restoration efforts. GeoVM's hierarchical structure allows measurement and verification at species, habitat, and ecosystem levels. Build systems where conservation efforts have verified impact, creating tradable biodiversity credits with immutable links to specific protected areas and restoration projects."
  },
  // MOBILITY & TRANSPORTATION
  {
    title: "Autonomous Vehicles",
    category: "Mobility & Transportation",
    blurb: "Enable secure, decentralized coordination between autonomous vehicles using verified location data.",
    body: "Build next-generation transportation networks where autonomous vehicles communicate and coordinate through a shared, trusted geospatial layer. GeoVM enables vehicles to share road conditions, traffic information, and movement intentions with cryptographic certainty about data sources. Create efficient route planning algorithms that consider real-time data across city regions while maintaining security for critical safety systems."
  },
  {
    title: "Ride Sharing",
    category: "Mobility & Transportation",
    blurb: "Create community-owned alternatives to centralized ride-sharing platforms with fair value distribution.",
    body: "Build ride-sharing networks owned and operated by drivers and passengers themselves. GeoVM's spatial understanding enables efficient matching based on proximity and routes without a central authority. Smart contracts can automatically distribute earnings based on verified rides, while the system's hierarchical nature allows both hyperlocal matching and broader regional planning."
  },
  {
    title: "Supply Chain",
    category: "Mobility & Transportation",
    blurb: "Track goods from production to delivery with immutable location history and condition verification.",
    body: "Revolutionize supply chain transparency with end-to-end tracking systems built on GeoVM. Enable product journeys to be verified and visible from raw material origins to final delivery, with condition monitoring at every stage. Build applications where cross-border shipping, local distribution, and last-mile delivery all operate on the same verifiable infrastructure, creating new opportunities for transparent, efficient logistics markets."
  },
  {
    title: "Drone Delivery",
    category: "Mobility & Transportation",
    blurb: "Orchestrate autonomous drone deliveries with verified flight paths and secure coordination.",
    body: "Create the infrastructure for scalable drone delivery systems that can safely coordinate thousands of simultaneous flights. GeoVM enables secure airspace allocation at multiple altitudes, verifiable flight path recording, and efficient delivery optimization. Build applications where drones from multiple operators can safely share airspace through consensus on real-time location data and intended routes."
  },
  // CAPITAL MARKETS & FINANCE
  {
    title: "Tokenized Real Estate",
    category: "Capital Markets & Finance",
    blurb: "Create verifiable digital twins of properties with automated valuation and fractional ownership.",
    body: "Transform real estate markets by connecting digital assets directly to verifiable physical properties. GeoVM enables the creation of property tokens with immutable links to their geographic footprint and associated rights. Build applications for fractional ownership, automated rental systems, and property derivatives all linked to verifiable on-chain representations of physical spaces."
  },
  {
    title: "Spatial Insurance",
    category: "Capital Markets & Finance",
    blurb: "Enable parametric insurance for natural disasters with automated verification and claims processing.",
    body: "Create next-generation insurance products that automatically assess risk and process claims based on verifiable geospatial data. GeoVM allows insurance contracts to directly reference physical locations and receive verified data about events like floods, fires, or storms. Build parametric insurance systems that automatically trigger payouts when conditions are met, reducing administrative costs and accelerating disaster recovery."
  },
  {
    title: "Location-Based Assets",
    category: "Capital Markets & Finance",
    blurb: "Trade futures and options on location-dependent assets with built-in geographical constraints.",
    body: "Create specialized markets for assets whose value is intrinsically linked to location, such as advertising space, resource extraction rights, or development opportunities. GeoVM's native support for geospatial relationships enables trading platforms where asset values automatically reflect their precise location and spatial context. Build derivatives and structured products that incorporate geographic constraints and dependencies."
  },
  {
    title: "Infrastructure Funding",
    category: "Capital Markets & Finance",
    blurb: "Enable community-driven infrastructure investment with transparent impact verification.",
    body: "Transform how infrastructure is funded by creating direct connections between investors and verifiable project outcomes. GeoVM enables transparent tracking of development projects from planning through construction and operation. Build systems where infrastructure bonds can be tokenized and traded based on real-time progress and performance metrics, with automated dividend distribution based on usage verification."
  },
  // DATA & ANALYTICS
  {
    title: "Decentralized AI Training",
    category: "Data & Analytics",
    blurb: "Create fair, transparent markets for location-specific AI training data with verified provenance.",
    body: "Build equitable data markets where individuals and communities can monetize their local knowledge while maintaining control over usage. GeoVM enables the creation of data exchanges where AI developers can access high-quality, location-specific training data with verified provenance. Create systems that automatically compensate data providers when their contributions improve model performance for specific geographic contexts."
  },
  {
    title: "Spatial Analytics",
    category: "Data & Analytics",
    blurb: "Deploy analytics processing across distributed nodes with location-optimized task allocation.",
    body: "Create decentralized computation networks that efficiently process geospatial data by matching computation with data locality. GeoVM enables analytics tasks to be distributed across nodes with geographic awareness, reducing data transfer requirements and improving performance. Build systems where complex spatial operations can be performed across decentralized infrastructure while maintaining verifiable results."
  },
  {
    title: "Location Intelligence",
    category: "Data & Analytics",
    blurb: "Trade verified insights derived from spatial relationships and movement patterns.",
    body: "Create markets for valuable location intelligence that respects privacy while enabling businesses to access actionable insights. GeoVM's hierarchical structure enables analysis at varying levels of anonymization appropriate to different use cases. Build platforms where foot traffic patterns, consumer behavior trends, and site selection analytics can be bought and sold with cryptographic verification of data quality and methodology."
  },
  {
    title: "Geospatial Oracles",
    category: "Data & Analytics",
    blurb: "Provide verified real-world location data to smart contracts through decentralized oracle networks.",
    body: "Build the critical infrastructure that connects on-chain applications with reliable, verified geospatial data from the physical world. GeoVM enables oracle networks specifically designed for location data, with consensus mechanisms that account for spatial relationships between multiple data sources. Create systems where smart contracts can confidently execute based on real-world locations and events, with economic incentives aligned to ensure data accuracy and availability."
  }
];

export function UseCasesSection() {
  const [selectedUseCase, setSelectedUseCase] = useState<typeof useCases[number] | null>(null);

  return (
    <section className="py-20 w-full items-center justify-center">
      <div className="container w-full mx-auto ">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Use Cases
            </h2>
            <p className="mx-auto max-w-8xl text-muted-foreground md:text-xl">
              Discover how GeoVM is transforming location-based applications and experiences
            </p>
          </div>
        </div>
        
        <div className="mt-12">
          <InfiniteMovingCards
            items={useCases.slice(0, 7)}
            direction="left"
            speed="slow"
            pauseOnHover={true}
            className=""
            onItemClick={(item) => setSelectedUseCase(item)}
          />
          <InfiniteMovingCards
            items={useCases.slice(7, 14)}
            direction="right"
            speed="slow"
            pauseOnHover={true}
            className=""
            onItemClick={(item) => setSelectedUseCase(item)}
          />
          <InfiniteMovingCards
            items={useCases.slice(14)}
            direction="left"
            speed="slow"
            pauseOnHover={true}
            className=""
            onItemClick={(item) => setSelectedUseCase(item)}
          />
        </div>

        {selectedUseCase && (
          <ExpandableCard
            useCase={selectedUseCase}
            isOpen={!!selectedUseCase}
            onClose={() => setSelectedUseCase(null)}
          />
        )}
      </div>
    </section>
  );
} 