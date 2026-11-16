import {
  Car,
  Coffee,
  Film,
  HeartPulse,
  Home,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tag,
  Utensils,
  Zap,
} from 'lucide-react';

interface TagIconProps {
  tagName?: string | null;
  className?: string;
}

/**
 * Purely visual icon helper mapping user-created tag names to clean outlined Lucide icons
 * matching the reference mockup (ShoppingCart for Groceries, Utensils for Food, Car for Travel).
 */
export function TagIcon({ tagName, className = 'h-[18px] w-[18px]' }: TagIconProps) {
  const lower = (tagName || '').trim().toLowerCase();

  if (!lower || lower === 'uncategorized') {
    return <Receipt className={className} strokeWidth={1.8} />;
  }
  if (lower.includes('grocer') || lower.includes('mart') || lower.includes('market')) {
    return <ShoppingCart className={className} strokeWidth={1.8} />;
  }
  if (lower.includes('food') || lower.includes('dining') || lower.includes('dinner') || lower.includes('lunch')) {
    return <Utensils className={className} strokeWidth={1.8} />;
  }
  if (lower.includes('coffee') || lower.includes('cafe') || lower.includes('tea')) {
    return <Coffee className={className} strokeWidth={1.8} />;
  }
  if (lower.includes('travel') || lower.includes('transport') || lower.includes('cab') || lower.includes('fuel') || lower.includes('auto')) {
    return <Car className={className} strokeWidth={1.8} />;
  }
  if (lower.includes('shop') || lower.includes('cloth') || lower.includes('amazon')) {
    return <ShoppingBag className={className} strokeWidth={1.8} />;
  }
  if (lower.includes('rent') || lower.includes('home') || lower.includes('house')) {
    return <Home className={className} strokeWidth={1.8} />;
  }
  if (lower.includes('bill') || lower.includes('util') || lower.includes('electric') || lower.includes('wifi')) {
    return <Zap className={className} strokeWidth={1.8} />;
  }
  if (lower.includes('entertain') || lower.includes('movie') || lower.includes('game')) {
    return <Film className={className} strokeWidth={1.8} />;
  }
  if (lower.includes('medic') || lower.includes('health') || lower.includes('doctor') || lower.includes('pharma')) {
    return <HeartPulse className={className} strokeWidth={1.8} />;
  }
  if (lower.includes('personal') || lower.includes('care')) {
    return <Sparkles className={className} strokeWidth={1.8} />;
  }

  return <Tag className={className} strokeWidth={1.8} />;
}
