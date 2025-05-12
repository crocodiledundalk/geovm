export function FeatureSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-16">
      <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-800">
        <h3 className="text-xl font-semibold mb-3">Decentralized Worlds</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Create and manage your own geospatial worlds on the Solana blockchain
        </p>
      </div>
      <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-800">
        <h3 className="text-xl font-semibold mb-3">Interactive Globe</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Explore worlds through an interactive 3D globe visualization
        </p>
      </div>
      <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-800">
        <h3 className="text-xl font-semibold mb-3">Real-time Updates</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Experience real-time updates and interactions with your geospatial data
        </p>
      </div>
    </div>
  );
} 