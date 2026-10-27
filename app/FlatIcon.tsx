import { Hand, CalendarDays, TrendingUp, Target, Lightbulb, Library, Clapperboard, PencilLine, Gift, School, CircleHelp, ScrollText, ShieldCheck, Smartphone, Palette, LogOut, Award, Hourglass, UserCog, Sparkles, Star, GraduationCap, ClipboardList, Wallet, Coins, BadgeCheck, AlertTriangle, CreditCard, Film, Calendar, FolderOpen } from 'lucide-react'

// Flat line icons that replace the old emoji pictures (the data still carries the emoji as a key).
const MAP: Record<string, any> = {
  '🙋': Hand, '🗓️': CalendarDays, '📈': TrendingUp, '🎯': Target, '💡': Lightbulb, '📚': Library, '🎬': Clapperboard, '📝': PencilLine,
  '🎁': Gift, '🏫': School, '❓': CircleHelp, '📜': ScrollText, '🔒': ShieldCheck, '📲': Smartphone, '🎨': Palette, '🚪': LogOut, '🏅': Award,
  '⏳': Hourglass, '🧑‍🏫': UserCog, '✨': Sparkles, '⭐': Star, '🎓': GraduationCap, '🎞️': Film, '📋': ClipboardList, '📅': Calendar,
  '💰': Wallet, '🪙': Coins, '👩‍🎓': BadgeCheck, '⚠️': AlertTriangle, '💳': CreditCard, '📁': FolderOpen,
}
export default function FlatIcon({ e, size = 20, color }: { e: string; size?: number; color?: string }) {
  const I = MAP[e]
  return I ? <I size={size} color={color} strokeWidth={2} /> : <span>{e}</span>
}
