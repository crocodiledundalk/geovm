'use client';

import { useEffect, useState } from 'react';

const contractCode = `
#[program]
pub mod geo_program {
    use super::*;

    #[derive(Accounts)]
    pub struct Initialize<'info> {
        #[account(init, payer = user, space = 8 + Location::SIZE)]
        pub location_account: Account<'info, Location>,
        #[account(mut)]
        pub user: Signer<'info>,
        pub system_program: Program<'info, System>,
    }

    #[account]
    pub struct Location {
        pub trixel_id: u64,
        pub timestamp: i64,
        pub merkle_root: [u8; 32],
    }
}`;

export function CodeEditorAnimation() {
  const [displayedCode, setDisplayedCode] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Start the animation sequence
    const timer = setTimeout(() => {
      setIsVisible(true);
      let currentIndex = 0;
      
      const typingInterval = setInterval(() => {
        if (currentIndex < contractCode.length-1) {
          setDisplayedCode(prev => prev + contractCode[currentIndex]);
          currentIndex++;
        } else {
          clearInterval(typingInterval);
        }
      }, 10); // Adjust typing speed here

      return () => clearInterval(typingInterval);
    }, 500); // Delay before starting

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div 
        className={`w-[800px] h-[500px] border-[0.5px] border-teal-500 rounded-lg shadow-2xl transform transition-all duration-500 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Editor header */}
        <div className="h-10 border-b-[0.5px] border-teal-500 rounded-t-lg flex items-center px-4">
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full border-[0.5px] border-teal-500" />
            <div className="w-3 h-3 rounded-full border-[0.5px] border-teal-500" />
            <div className="w-3 h-3 rounded-full border-[0.5px] border-teal-500" />
          </div>
          <div className="ml-4 text-teal-500/50 text-sm">depin_program.rs</div>
        </div>
        
        {/* Code content */}
        <div className="p-4 font-mono text-sm text-teal-500/50">
          <pre className="whitespace-pre-wrap">
            <code>{displayedCode}</code>
          </pre>
          {/* Blinking cursor */}
          <span className={`inline-block w-2 h-5 border-r-[0.5px] border-teal-500 ml-1 ${isVisible ? 'animate-blink' : ''}`} />
        </div>
      </div>
    </div>
  );
} 