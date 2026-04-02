"use client";

import { useState, useEffect } from "react";
import { SavedOutfitWithDetailsResponse, OutfitRecommendationItemResponse } from "@/lib/api";

interface PriceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedOutfits: SavedOutfitWithDetailsResponse[];
  onPriceUpdate: (itemId: string, newPrice: number) => Promise<void>;
}

export default function PriceEditModal({
  isOpen,
  onClose,
  savedOutfits,
  onPriceUpdate,
}: PriceEditModalProps) {
  const [selectedOutfitId, setSelectedOutfitId] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<OutfitRecommendationItemResponse | null>(null);
  const [newPrice, setNewPrice] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  const selectedOutfit = savedOutfits.find((o) => o.id === selectedOutfitId);
  const items = selectedOutfit?.recommendation?.items || [];

  useEffect(() => {
    if (!isOpen) {
      setSelectedOutfitId("");
      setSelectedItem(null);
      setNewPrice("");
    }
  }, [isOpen]);

  const handleItemSelect = (item: OutfitRecommendationItemResponse) => {
    setSelectedItem(item);
    setNewPrice(item.price ? item.price.toString() : "");
  };

  const handleSubmit = async () => {
    if (!selectedItem || !newPrice) return;

    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) {
      alert("Please enter a valid price");
      return;
    }

    setIsUpdating(true);
    try {
      await onPriceUpdate(selectedItem.id, price);
      onClose();
    } catch (error) {
      console.error("Failed to update price:", error);
      alert("Failed to update price");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-panel rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-stone-200 dark:border-stone-700 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-stone-200 dark:border-stone-700">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white font-cabinet">
              Edit Item Price
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Select an outfit and item to modify its price (for demo purposes)
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Select Outfit */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              1. Select Saved Outfit
            </label>
            <select
              value={selectedOutfitId}
              onChange={(e) => {
                setSelectedOutfitId(e.target.value);
                setSelectedItem(null);
                setNewPrice("");
              }}
              className="w-full px-4 py-3 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-transparent"
            >
              <option value="">-- Choose an outfit --</option>
              {savedOutfits.map((outfit) => (
                <option key={outfit.id} value={outfit.id}>
                  {outfit.recommendation?.occasion || "Untitled Outfit"}
                  {outfit.original_total_price && ` ($${outfit.original_total_price.toFixed(0)})`}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Select Item */}
          {selectedOutfitId && items.length > 0 && (
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                2. Select Item to Edit
              </label>
              <div className="space-y-2">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleItemSelect(item)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      selectedItem?.id === item.id
                        ? "border-brand bg-brand/5 dark:bg-brand/10"
                        : "border-stone-200 dark:border-stone-700 hover:border-brand/50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                          {item.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.brand} • {item.category}
                        </p>
                        <p className="text-sm font-bold text-brand dark:text-brand-400 mt-1">
                          Current: ${item.price?.toFixed(2) || "N/A"}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Enter New Price */}
          {selectedItem && (
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                3. Enter New Price
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-bold">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-transparent"
                    />
                  </div>
                </div>
                {selectedItem.price && parseFloat(newPrice) > 0 && (
                  <div className="text-sm">
                    {parseFloat(newPrice) < selectedItem.price ? (
                      <span className="text-green-600 dark:text-green-400 font-bold">
                        ↓ ${(selectedItem.price - parseFloat(newPrice)).toFixed(2)} off
                      </span>
                    ) : parseFloat(newPrice) > selectedItem.price ? (
                      <span className="text-red-600 dark:text-red-400 font-bold">
                        ↑ ${(parseFloat(newPrice) - selectedItem.price).toFixed(2)} increase
                      </span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">
                        No change
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-stone-200 dark:border-stone-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedItem || !newPrice || isUpdating}
            className="flex-1 px-4 py-3 bg-brand dark:bg-brand-400 text-white dark:text-gray-900 rounded-xl font-bold hover:bg-brand-600 dark:hover:bg-brand-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? "Updating..." : "Update Price"}
          </button>
        </div>
      </div>
    </div>
  );
}
