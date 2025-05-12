import Link from 'next/link';
import { Github, Twitter } from 'lucide-react';

export const FooterSection = () => {
  return (
    <div className="relative w-full h-full pointer-events-none">
      
      {/* <footer className="border-t border-zinc-200 dark:border-zinc-800"> */}
      <footer className="px-12">

        <div className="relative w-full h-full pt-24">
            <svg 
              width="100%" 
              height="100%" 
              viewBox="0 0 500 94" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="bottom-0 right-0 w-full h-auto"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="25%" stopColor="currentColor" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M49.3662 0.941406C57.3021 0.941436 64.4276 2.26388 70.7422 4.90918C77.1421 7.55451 82.5181 11.3951 86.8701 16.4297L73.5576 28.7178C70.315 25.3044 66.7736 22.7864 62.9336 21.165C59.0937 19.4585 54.9121 18.6055 50.3896 18.6055C46.0379 18.6055 42.0702 19.2881 38.4863 20.6533C34.9023 22.0186 31.7869 23.981 29.1416 26.541C26.5816 29.101 24.5766 32.1312 23.126 35.6299C21.7608 39.1284 21.0781 43.0109 21.0781 47.2773C21.0781 51.4587 21.7606 55.2992 23.126 58.7979C24.5766 62.2963 26.5817 65.3684 29.1416 68.0137C31.7869 70.5737 34.8597 72.536 38.3584 73.9014C41.9423 75.2666 45.8673 75.9492 50.1338 75.9492C54.2298 75.9492 58.1981 75.3093 62.0381 74.0293C63.4631 73.5336 64.8704 72.9184 66.2617 72.1865V59.375L51.4141 45.0781H85.2266V56.6338L85.2061 56.6367V82.2217L84.2842 82.8994C79.6292 86.2394 74.2616 88.829 68.1816 90.6689C61.7818 92.6315 55.3822 93.6132 48.9824 93.6133C41.8998 93.6133 35.3708 92.5038 29.3975 90.2852C23.5098 87.9812 18.3473 84.7387 13.9102 80.5576C9.55826 76.3764 6.14457 71.4697 3.66992 65.8379C1.28059 60.2059 0.0859375 54.0187 0.0859375 47.2773C0.0859447 40.5362 1.28069 34.3497 3.66992 28.7178C6.14459 23.0858 9.60075 18.1784 14.0381 13.9971C18.4754 9.81585 23.6811 6.61609 29.6543 4.39746C35.6276 2.09354 42.1983 0.941406 49.3662 0.941406ZM125.557 22.1895C132.298 22.1895 138.356 23.6398 143.732 26.541C149.194 29.357 153.503 33.4532 156.66 38.8291C159.817 44.1198 161.396 50.4774 161.396 57.9014C161.396 58.6692 161.354 59.5651 161.269 60.5889C161.183 61.5275 161.098 62.424 161.013 63.2773H108.911C109.313 65.1103 109.954 66.8175 110.837 68.3975C112.544 71.2133 114.89 73.3889 117.877 74.9248C120.949 76.3754 124.533 77.1016 128.629 77.1016C132.298 77.1015 135.498 76.5468 138.229 75.4375C141.044 74.3282 143.604 72.6639 145.908 70.4453L156.532 81.9648C153.375 85.5487 149.407 88.3225 144.629 90.2852C139.85 92.1625 134.346 93.1016 128.116 93.1016C120.266 93.1015 113.354 91.565 107.381 88.4932C101.493 85.4212 96.9272 81.2399 93.6846 75.9492C90.4419 70.5733 88.8204 64.4721 88.8203 57.6455C88.8203 50.7335 90.3993 44.6315 93.5566 39.3408C96.7993 33.965 101.194 29.7835 106.74 26.7969C112.287 23.7249 118.559 22.1895 125.557 22.1895ZM202.338 22.1895C209.591 22.1895 216.076 23.7251 221.793 26.7969C227.51 29.7835 231.991 33.9223 235.233 39.2129C238.476 44.5036 240.098 50.6482 240.098 57.6455C240.098 64.4721 238.476 70.5733 235.233 75.9492C231.991 81.2399 227.51 85.4212 221.793 88.4932C216.076 91.565 209.591 93.1015 202.338 93.1016C194.999 93.1016 188.471 91.565 182.754 88.4932C177.122 85.4212 172.641 81.2399 169.313 75.9492C166.071 70.5733 164.449 64.4721 164.449 57.6455C164.449 50.7335 166.071 44.6315 169.313 39.3408C172.641 33.965 177.122 29.7835 182.754 26.7969C188.471 23.7251 194.999 22.1895 202.338 22.1895ZM301.2 18.9648H277.853C273.842 18.9649 270.557 19.4345 267.997 20.373C265.437 21.3117 263.391 22.34 262.281 23.876C261.172 25.3266 260.829 25.8713 260.829 27.834C260.829 30.1378 261.767 32.3863 263.645 33.8369C265.522 35.2022 267.996 36.3117 271.068 37.165C274.14 38.0184 277.511 38.8713 281.181 39.7246C284.935 40.5779 288.647 41.5596 292.316 42.6689C296.071 43.7782 299.485 44.2712 302.557 46.1484C305.629 48.0258 308.103 50.5012 309.98 53.5732C311.943 56.6452 312.925 60.5275 312.925 65.2207C312.925 70.2553 311.517 74.8636 308.701 79.0449C305.885 83.2263 302.66 86.5972 297.028 89.1572C291.482 91.717 283.442 92.997 274.909 92.9971H250.175L243.175 76.3564H275.037C279.133 76.3564 282.418 75.973 284.893 75.2051C287.452 74.3518 289.33 73.1996 290.524 71.749C291.719 70.2984 292.316 68.6342 292.316 66.7568C292.316 64.3676 291.378 62.4903 289.501 61.125C287.624 59.6744 285.149 59.5222 282.077 58.6689C279.005 57.7303 275.591 56.8774 271.837 56.1094C268.168 55.2561 264.456 54.2317 260.701 53.0371C257.032 51.8424 253.661 50.306 250.589 48.4287C247.517 46.5514 245 43.0768 243.037 40.0049C241.16 36.9329 240.221 33.0072 240.221 28.2285C240.221 23.109 241.586 20.4583 244.316 16.2773C247.132 12.0108 250.314 8.63969 255.86 6.16504C261.492 3.60506 269.651 1.88479 278.099 1.88477H293.618L301.2 18.9648ZM347.676 65.8789L375.339 1.88477H395.946L357.162 91.4844H336.683L298.026 1.88477H320.427L347.676 65.8789ZM449.021 57.5195L482.02 1.88477H499.043L499.3 91.4844H479.844L479.729 37.7051L453.348 82.0127H444.003L417.764 38.8652V91.4844H398.308V1.88477H415.459L449.021 57.5195ZM202.338 38.5732C199.01 38.5732 196.022 39.341 193.377 40.877C190.732 42.4129 188.599 44.5894 186.978 47.4053C185.442 50.2213 184.674 53.6348 184.674 57.6455C184.674 61.5706 185.442 64.9836 186.978 67.8848C188.599 70.7006 190.732 72.8771 193.377 74.4131C196.022 75.9491 199.01 76.7168 202.338 76.7168C205.666 76.7167 208.653 75.949 211.298 74.4131C213.943 72.8771 216.033 70.7006 217.569 67.8848C219.105 64.9836 219.873 61.5706 219.873 57.6455C219.873 53.6348 219.105 50.2213 217.569 47.4053C216.033 44.5893 213.943 42.4129 211.298 40.877C208.653 39.341 205.666 38.5733 202.338 38.5732ZM125.685 37.293C122.271 37.293 119.242 38.0617 116.597 39.5977C114.037 41.0483 112.031 43.1385 110.58 45.8691C109.644 47.5758 109.013 49.4961 108.681 51.6289H142.588C142.264 49.4597 141.623 47.4969 140.66 45.7412C139.21 43.096 137.204 41.0483 134.645 39.5977C132.085 38.0617 129.098 37.293 125.685 37.293Z" fill="url(#logoGradient)" className="text-black/50 dark:text-white"/>
            </svg>
        </div>
        
        <div className="container mx-auto px-4 pb-12 ">

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 -mt-16">
            <div className="space-y-4 md:col-span-2 pr-20">
              <h3 className="text-lg font-semibold">
                <img 
                    src="/logo-white.svg"
                    alt="GeoVM" 
                    className="h-4 w-auto inline-block text-teal-500"
                />
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                The first virtual machine with an <b>inherent understanding of our world's geospatial hierarchy</b>. 
                Unlock new frontiers for <b>physical infrastucture networks</b>, <b>location-based capital markets</b> and more.
              </p>
            </div>

  
            
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Project</h4>
              <ul className="space-y-2">
                <li><Link href="/worlds" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">Demo App</Link></li>
                <li><Link href="#explainer" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" title="Coming soon" onClick={(e) => e.preventDefault()}>How it works</Link></li>
                <li><Link href="#video" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" title="Coming soon" onClick={(e) => e.preventDefault()}>Explainer Video</Link></li>
                <li><Link href="#whitepaper" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" title="Coming soon" onClick={(e) => e.preventDefault()}>Documentation</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Company</h4>
              <ul className="space-y-2">
                <li><Link href="" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" title="Coming soon" onClick={(e) => e.preventDefault()}>About</Link></li>
                <li><Link href="" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" title="Coming soon" onClick={(e) => e.preventDefault()}>Blog</Link></li>
                <li><Link href="" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" title="Coming soon" onClick={(e) => e.preventDefault()}>Contact</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Connect</h4>
              <div className="flex space-x-4">
                <Link 
                  href="https://github.com/crocodiledundalk/geovm" 
                  className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-5 w-5" />
                </Link>
                <Link 
                  href="https://x.com/geosvm" 
                  className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Twitter className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 ">
            <p className="text-sm text-center text-zinc-600 dark:text-zinc-400">
              © {new Date().getFullYear()} GeoSVM. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>

  );
}; 