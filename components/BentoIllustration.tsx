import React from 'react';

export default function BentoIllustration() {
  return (
    <div className="relative w-full max-w-[300px] aspect-[4/3] mx-auto animate-in fade-in zoom-in duration-1000">
      {/* Soft Elevated Tray */}
      <div className="absolute inset-0 bg-[#FDFBF7] rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-white/60 overflow-hidden p-3">
        <div className="h-full w-full grid grid-cols-12 grid-rows-6 gap-3">
          
          {/* Main Compartment (Rice / Big Task) */}
          <div className="col-span-8 row-span-4 bg-white rounded-[1.8rem] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] border border-slate-50 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white to-[#F9F9F9]" />
            {/* Subtle Texture Detail */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-[#F5F5F5] rounded-full blur-2xl opacity-40" />
          </div>

          {/* Side Compartment (Protein / Medium Task) */}
          <div className="col-span-4 row-span-4 bg-[#FDF5F0] rounded-[1.8rem] shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] border border-[#FBE9DC]/30 relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-[#FDF5F0] to-[#FBECE1]" />
          </div>

          {/* Bottom Left Compartment (Small Task) */}
          <div className="col-span-6 row-span-2 bg-[#F0F7F9] rounded-[1.8rem] shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] border border-[#E1EEF2]/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#F0F7F9] to-[#E6F1F4]" />
          </div>

          {/* Bottom Right Compartment (Small Task) */}
          <div className="col-span-6 row-span-2 bg-[#F2F7F2] rounded-[1.8rem] shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] border border-[#E8F1E8]/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#F2F7F2] to-[#EBF3EB]" />
          </div>
          
        </div>
      </div>
      
      {/* Minimal Garnish Accents (Floating soft blurs) */}
      <div className="absolute top-[15%] left-[15%] w-1.5 h-1.5 bg-[#A8E6CF] rounded-full blur-[1px] opacity-20" />
      <div className="absolute bottom-[20%] right-[40%] w-1 h-1 bg-[#FFD1DC] rounded-full blur-[0.5px] opacity-20" />
    </div>
  );
}
