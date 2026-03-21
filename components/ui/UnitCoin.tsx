// components/ui/UnitCoin.tsx
// Badge de UnitCoin — moneda interna de UnitPro.
// Usarlo en cualquier lugar donde se muestre un precio en UC.

import React from "react";

interface UCoinProps {
  amount: number;
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean; // si mostrar "UC" al lado del número
}

export function UCoin({ amount, size = "sm", showLabel = false }: UCoinProps) {
  const badgeSizes = {
    xs: "w-4 h-4 text-[7px]",
    sm: "w-5 h-5 text-[8px]",
    md: "w-6 h-6 text-[9px]",
    lg: "w-8 h-8 text-[11px]",
  };
  const textSizes = {
    xs: "text-xs font-bold",
    sm: "text-sm font-bold",
    md: "text-base font-bold",
    lg: "text-xl font-black",
  };

  if (amount === 0) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className={`${badgeSizes[size]} rounded-full bg-emerald-500 text-white font-black flex items-center justify-center shrink-0`}>
          ✓
        </span>
        <span className={`${textSizes[size]} text-emerald-600`}>Gratis</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`${badgeSizes[size]} rounded-full text-white font-black flex items-center justify-center shrink-0 shadow-sm`}
        style={{ backgroundColor: "#577a2c" }}
      >
        UnitCoin
      </span>
      <span className={textSizes[size]}>
        {amount}
        {showLabel && <span className="font-normal text-zinc-400 ml-0.5">/mes</span>}
      </span>
    </span>
  );
}
