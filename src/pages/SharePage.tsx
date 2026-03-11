import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Share2, Copy, Twitter, MessageCircle, Trophy, Medal, Crown, ChevronUp, ChevronDown, Minus, Flame, Leaf } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const DAILY_GOAL_KG = 14;
const WEEKLY_GOAL = DAILY_GOAL_KG * 7;

// Simulated friends for leaderboard
const FAKE_FRIENDS = [
  { name: "Valentina R.", avatar: "VR", weeklyKg: 42.3, trend: "down" as const },
  { name: "Carlos M.", avatar: "CM", weeklyKg: 55.8, trend: "up" as const },
  { name: "Lucía G.", avatar: "LG", weeklyKg: 61.2, trend: "same" as const },
  { name: "Andrés P.", avatar: "AP", weeklyKg: 72.5, trend: "up" as const },
  { name: "Mariana S.", avatar: "MS", weeklyKg: 78.1, trend: "down" as const },
  { name: "Diego F.", avatar: "DF", weeklyKg: 85.4, trend: "up" as const },
  { name: "Sofía L.", avatar: "SL", weeklyKg: 91.0, trend: "same" as const },
];

function getRankStyle(position: number) {
  if (position === 1) return { icon: Crown, color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", badge: "🥇" };
  if (position === 2) return { icon: Medal, color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/30", badge: "🥈" };
  if (position === 3) return { icon: Medal, color: "text-amber-600", bg: "bg-amber-600/10", border: "border-amber-600/30", badge: "🥉" };
  return { icon: Leaf, color: "text-muted-foreground", bg: "bg-muted/50", border: "border-border", badge: `#${position}` };
}

const TrendIcon = ({ trend }: { trend: "up" | "down" | "same" }) => {
  if (trend === "down") return <ChevronDown className="w-3.5 h-3.5 text-emerald-500" />;
  if (trend === "up") return <ChevronUp className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
};

type LeaderboardEntry = {
  name: string;
  avatar: string;
  weeklyKg: number;
  trend: "up" | "down" | "same";
  isUser: boolean;
};

export default function SharePage() {
  const { user } = useAuth();
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [userName, setUserName] = useState("Tú");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const ws = format(weekStart, "yyyy-MM-dd");
    const we = format(weekEnd, "yyyy-MM-dd");

    const fetchData = async () => {
      const [mealsRes, tripsRes, profileRes] = await Promise.all([
        supabase.from("meals").select("carbon_kg").eq("user_id", user.id).gte("date", ws).lte("date", we),
        supabase.from("trips").select("carbon_kg").eq("user_id", user.id).gte("date", ws).lte("date", we),
        supabase.from("profiles").select("name").eq("user_id", user.id).maybeSingle(),
      ]);
      const mc = (mealsRes.data ?? []).reduce((s, r) => s + Number(r.carbon_kg), 0);
      const tc = (tripsRes.data ?? []).reduce((s, r) => s + Number(r.carbon_kg), 0);
      const total = mc + tc;
      setWeeklyTotal(total);

      if (profileRes.data?.name) setUserName(profileRes.data.name);

      // Build leaderboard: user + fake friends, sorted by lowest CO₂
      const userEntry: LeaderboardEntry = {
        name: profileRes.data?.name || "Tú",
        avatar: (profileRes.data?.name || "TU").slice(0, 2).toUpperCase(),
        weeklyKg: total,
        trend: total < WEEKLY_GOAL * 0.6 ? "down" : total < WEEKLY_GOAL * 0.85 ? "same" : "up",
        isUser: true,
      };
      const all = [...FAKE_FRIENDS.map(f => ({ ...f, isUser: false })), userEntry];
      all.sort((a, b) => a.weeklyKg - b.weeklyKg);
      setLeaderboard(all);
    };
    fetchData();
  }, [user]);

  const userPosition = leaderboard.findIndex(e => e.isUser) + 1;
  const pct = WEEKLY_GOAL > 0 ? Math.min((weeklyTotal / WEEKLY_GOAL) * 100, 150) : 0;

  const shareText = `🏆 ¡Estoy #${userPosition} en el ranking EcoTrack!\n🌿 Mi huella: ${weeklyTotal.toFixed(1)} kg CO₂ esta semana\n📊 ${pct.toFixed(0)}% de mi meta semanal\n¡Únete y compite! 🌍`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareText);
    toast.success("¡Copiado al portapapeles!");
  };
  const shareTwitter = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank");
  const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" /> Ranking Semanal
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Compite con tus amigos por la menor huella</p>
      </div>

      {/* User Position Highlight */}
      {userPosition > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl font-black text-primary">#{userPosition}</div>
                <div>
                  <p className="font-semibold text-foreground">Tu posición</p>
                  <p className="text-xs text-muted-foreground">{weeklyTotal.toFixed(1)} kg CO₂ · {pct.toFixed(0)}% de meta</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <TrendIcon trend={leaderboard.find(e => e.isUser)?.trend || "same"} />
                <span className="text-muted-foreground">vs semana pasada</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Leaderboard */}
      <div className="space-y-2">
        {leaderboard.map((entry, i) => {
          const pos = i + 1;
          const style = getRankStyle(pos);
          return (
            <motion.div
              key={entry.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={`${entry.isUser ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20" : style.border} ${style.bg}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <span className="text-lg font-bold w-8 text-center">{style.badge}</span>
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className={`text-xs font-bold ${entry.isUser ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {entry.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${entry.isUser ? "text-primary" : "text-foreground"}`}>
                      {entry.isUser ? `${entry.name} (Tú)` : entry.name}
                    </p>
                    <div className="flex items-center gap-1">
                      <TrendIcon trend={entry.trend} />
                      <span className="text-xs text-muted-foreground">
                        {entry.trend === "down" ? "Mejorando" : entry.trend === "up" ? "Subiendo" : "Estable"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{entry.weeklyKg.toFixed(1)}</p>
                    <p className="text-[10px] text-muted-foreground">kg CO₂</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Share Actions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs text-muted-foreground">Comparte tu ranking con amigos</p>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={copyToClipboard} className="gap-1.5 text-xs">
                <Copy className="w-4 h-4" /> Copiar
              </Button>
              <Button variant="outline" onClick={shareTwitter} className="gap-1.5 text-xs">
                <Twitter className="w-4 h-4" /> Twitter
              </Button>
              <Button variant="outline" onClick={shareWhatsApp} className="gap-1.5 text-xs">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
