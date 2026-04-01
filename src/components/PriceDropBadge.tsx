"use client";

interface PriceDropBadgeProps {
  originalPrice: number;
  currentPrice: number;
}

export default function PriceDropBadge({ originalPrice, currentPrice }: PriceDropBadgeProps) {
  if (currentPrice >= originalPrice) return null;

  const discount = originalPrice - currentPrice;
  const discountPercent = Math.round((discount / originalPrice) * 100);

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full text-xs font-bold shadow-lg animate-pulse-subtle">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
      </svg>
      <span>PRICE DROP</span>
      <span className="bg-white/20 px-2 py-0.5 rounded-full">
        {discountPercent}% OFF
      </span>
    </div>
  );
}
