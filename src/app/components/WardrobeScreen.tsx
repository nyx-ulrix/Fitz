import { useState, useEffect } from "react";
import { Plus, Search, Check, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AddItemScreen } from "./AddItemScreen";
import { useAuth } from "../lib/AuthContext";
import { api } from "../lib/api";

const CATEGORY_META = [
  { id: "tops",        label: "Tops",        emoji: "👚" },
  { id: "bottoms",     label: "Bottoms",     emoji: "👖" },
  { id: "dresses",     label: "Dresses",     emoji: "👗" },
  { id: "shoes",       label: "Shoes",       emoji: "👟" },
  { id: "accessories", label: "Accessories", emoji: "👜" },
  { id: "outerwear",   label: "Outerwear",   emoji: "🧥" },
  { id: "bags",        label: "Bags",        emoji: "👝" },
];

interface WardrobeItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  colour: string;
  season: string;
  price: number;
  worn: number;
  img?: string;
}

export function WardrobeScreen() {
  const { token } = useAuth();
  const [items, setItems]                 = useState<WardrobeItem[]>([]);
  const [loading, setLoading]             = useState(true);
  const [showAddScreen, setShowAddScreen] = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [collapsed, setCollapsed]         = useState<string[]>([]);

  const fetchWardrobeItems = async () => {
    if (!token) return;
    try {
      const { items: data } = await api.getWardrobe(token);
      setItems(
        (data ?? []).map((item: WardrobeItem & { colour?: string; image_url?: string; imageUrl?: string }) => ({
          id: item.id,
          name: item.name,
          brand: item.brand ?? "Wardrobe",
          category: item.category ?? "tops",
          colour: item.colour ?? "",
          season: item.season ?? "",
          price: item.price ?? 0,
          worn: item.worn ?? 0,
          img: item.img ?? item.image_url ?? item.imageUrl,
        })),
      );
    } catch (e) {
      console.log("Fetch wardrobe error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWardrobeItems(); }, [token]);

  const toggleSelect  = (id: string) => setSelectedItems(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);
  const toggleCollapse = (id: string) => setCollapsed(p => p.includes(id) ? p.filter(c => c !== id) : [...p, id]);

  const totalValue = items.reduce((a, i) => a + (i.price ?? 0), 0);
  const totalWorn  = items.reduce((a, i) => a + (i.worn  ?? 0), 0);

  const filtered = items.filter(i =>
    i.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.brand?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const grouped = CATEGORY_META.map(cat => ({
    ...cat,
    items: filtered.filter(i => i.category?.toLowerCase() === cat.id),
  })).filter(cat => cat.items.length > 0);

  if (showAddScreen) {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="add" initial={{ x: "100%", opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: "100%", opacity: 0 }} transition={{ type: "spring", damping: 28, stiffness: 300 }}>
          <AddItemScreen onBack={() => { setShowAddScreen(false); fetchWardrobeItems(); }} />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="flex flex-col pb-8">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 700, color: "var(--foreground)" }}>My Wardrobe</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>
          {items.length} items{totalValue > 0 ? ` · £${totalValue.toLocaleString()} value` : ""}
        </p>
        <div className="flex gap-3 mt-4">
          {[
            { label: "Items",      value: items.length },
            { label: "Times worn", value: totalWorn },
            { label: "Cost/wear",  value: items.length > 0 && totalWorn > 0 ? `£${(totalValue / totalWorn).toFixed(0)}` : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="flex-1 p-3 rounded-2xl text-center" style={{ background: "var(--card)", boxShadow: "0 2px 8px rgba(169,139,227,0.1)" }}>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--accent)", fontSize: "1.1rem" }}>{value}</p>
              <p className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-5 mb-5">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <Search size={15} style={{ color: "var(--muted-foreground)" }} />
          <input type="text" placeholder="Search your wardrobe…" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }} />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw size={24} style={{ color: "var(--accent)", animation: "spin 1s linear infinite" }} />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center py-16 px-8 text-center gap-3">
          <span style={{ fontSize: "2.5rem" }}>👗</span>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--foreground)" }}>Your wardrobe is empty</p>
          <p className="text-sm" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>Tap + to add your first item</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 px-5">
          {grouped.map(cat => {
            const isCollapsed = collapsed.includes(cat.id);
            return (
              <div key={cat.id} className="rounded-3xl overflow-hidden" style={{ background: "var(--card)", border: "1.5px solid var(--border)", boxShadow: "0 2px 12px rgba(169,139,227,0.08)" }}>
                <button className="w-full flex items-center justify-between px-4 py-3.5" style={{ borderBottom: isCollapsed ? "none" : "1px solid var(--border)" }} onClick={() => toggleCollapse(cat.id)}>
                  <div className="flex items-center gap-2.5">
                    <span style={{ fontSize: "1.1rem" }}>{cat.emoji}</span>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 600, color: "var(--foreground)" }}>{cat.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--secondary)", color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{cat.items.length}</span>
                  </div>
                  {isCollapsed ? <ChevronDown size={16} style={{ color: "var(--muted-foreground)" }} /> : <ChevronUp size={16} style={{ color: "var(--muted-foreground)" }} />}
                </button>
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>
                      <div className="grid grid-cols-3 gap-2.5 p-3">
                        {cat.items.map(item => {
                          const isSelected = selectedItems.includes(item.id);
                          return (
                            <motion.div key={item.id} layout className="rounded-2xl overflow-hidden cursor-pointer relative"
                              style={{ background: "var(--background)", border: "1.5px solid", borderColor: isSelected ? "var(--accent)" : "var(--border)", boxShadow: isSelected ? "0 4px 12px rgba(169,139,227,0.3)" : "none" }}
                              onClick={() => toggleSelect(item.id)}>
                              {isSelected && (
                                <div className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }}>
                                  <Check size={10} color="white" />
                                </div>
                              )}
                              <div style={{ height: 100, background: "var(--muted)" }}>
                                {item.img
                                  ? <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                                  : <div className="w-full h-full flex items-center justify-center" style={{ fontSize: "2rem" }}>{cat.emoji}</div>}
                              </div>
                              <div className="px-2 py-2">
                                <p className="text-xs truncate" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--foreground)" }}>{item.name}</p>
                                <p className="text-xs truncate" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>{item.brand || "—"}</p>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--secondary)", color: "var(--foreground)", fontFamily: "var(--font-body)", fontSize: "0.6rem" }}>{item.season || "All"}</span>
                                  <span className="text-xs" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>×{item.worn ?? 0}</span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <div className="sticky bottom-6 flex justify-end px-5 mt-4 pointer-events-none">
        <button
          className="w-14 h-14 rounded-full flex items-center justify-center pointer-events-auto transition-transform hover:scale-105 active:scale-95"
          style={{ background: "var(--accent)", boxShadow: "0 8px 24px rgba(169,139,227,0.5)" }}
          onClick={() => setShowAddScreen(true)}>
          <Plus size={24} color="white" />
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
