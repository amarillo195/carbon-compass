import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Share2, Copy, Twitter, MessageCircle, Trophy, Medal, Crown, ChevronUp, ChevronDown, Minus, Leaf, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const DAILY_GOAL_KG = 14;
const WEEKLY_GOAL = DAILY_GOAL_KG * 7;

const FAKE_FRIENDS = [
  { name: "Valentina R.", avatar: "VR", weeklyKg: 42.3, trend: "down" as const },
  { name: "Carlos M.", avatar: "CM", weeklyKg: 55.8, trend: "up" as const },
  { name: "Lucía G.", avatar: "LG", weeklyKg: 61.2, trend: "same" as const },
  { name: "Andrés P.", avatar: "AP", weeklyKg: 72.5, trend: "up" as const },
  { name: "Mariana S.", avatar: "MS", weeklyKg: 78.1, trend: "down" as const },
  { name: "Diego F.", avatar: "DF", weeklyKg: 85.4, trend: "up" as const },
  { name: "Sofía L.", avatar: "SL", weeklyKg: 91.0, trend: "same" as const },
];

const TrendIcon = ({ trend }: { trend: "up" | "down" | "same" }) => {
  if (trend === "down") return <ChevronDown className="w-3.5 h-3.5 text-emerald-500" />;
  if (trend === "up") return <ChevronUp className="w-3.5 h-3.5 text-destructive" />;
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
      const total = (mealsRes.data ?? []).reduce((s, r) => s + Number(r.carbon_kg), 0) + (tripsRes.data ?? []).reduce((s, r) => s + Number(r.carbon_kg), 0);
      setWeeklyTotal(total);

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

  const copyToClipboard = () => { navigator.clipboard.writeText(shareText); toast.success("¡Copiado al portapapeles!"); };
  const shareTwitter = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank");
  const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");

  // Top 3 podium entries
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-accent/30 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-earth" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">Ranking Semanal</h1>
            <p className="text-[11px] text-muted-foreground">Compite con tus amigos por la menor huella</p>
          </div>
        </div>
      </motion.div>

      {/* Podium Top 3 */}
      {top3.length === 3 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-br from-accent/20 via-card to-primary/5">
            <CardContent className="p-5 pb-4">
              <div className="flex items-end justify-center gap-3 mb-2">
                {/* 2nd place */}
                <PodiumSlot entry={top3[1]} position={2} height="h-20" delay={0.3} />
                {/* 1st place */}
                <PodiumSlot entry={top3[0]} position={1} height="h-28" delay={0.2} isFirst />
                {/* 3rd place */}
                <PodiumSlot entry={top3[2]} position={3} height="h-16" delay={0.4} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* User Position Banner */}
      {userPosition > 0 && (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-0 shadow-md bg-gradient-to-r from-primary/10 to-primary/5 relative overflow-hidden">
            <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-primary/10" />
            <CardContent className="p-4 flex items-center justify-between relative">
              <div className="flex items-center gap-3">
                <div className="text-3xl font-black text-primary">#{userPosition}</div>
                <div>
                  <p className="font-bold text-foreground text-sm">Tu posición</p>
                  <p className="text-[11px] text-muted-foreground">{weeklyTotal.toFixed(1)} kg CO₂ · {pct.toFixed(0)}% de meta</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] bg-card/80 rounded-full px-2.5 py-1">
                <TrendIcon trend={leaderboard.find(e => e.isUser)?.trend || "same"} />
                <span className="text-muted-foreground">vs pasada</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Remaining Rankings */}
      <div className="space-y-2">
        {rest.map((entry, i) => {
          const pos = i + 4;
          return (
            <motion.div
              key={entry.name}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.04 }}
            >
              <Card className={`border-0 shadow-sm transition-all hover:shadow-md ${entry.isUser ? "ring-2 ring-primary/30 bg-primary/5" : "bg-card"}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground w-7 text-center">#{pos}</span>
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className={`text-xs font-bold ${entry.isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {entry.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${entry.isUser ? "text-primary" : "text-foreground"}`}>
                      {entry.isUser ? `${entry.name} (Tú)` : entry.name}
                    </p>
                    <div className="flex items-center gap-1">
                      <TrendIcon trend={entry.trend} />
                      <span className="text-[10px] text-muted-foreground">
                        {entry.trend === "down" ? "Mejorando" : entry.trend === "up" ? "Subiendo" : "Estable"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-foreground">{entry.weeklyKg.toFixed(1)}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">kg CO₂</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Share Actions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="border-0 shadow-md bg-gradient-to-r from-card to-accent/10">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent-foreground" />
              <p className="text-xs font-semibold text-foreground">Comparte tu ranking</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={copyToClipboard} className="gap-1.5 text-xs rounded-xl border-0 bg-muted/80 hover:bg-muted">
                <Copy className="w-4 h-4" /> Copiar
              </Button>
              <Button variant="outline" onClick={shareTwitter} className="gap-1.5 text-xs rounded-xl border-0 bg-muted/80 hover:bg-muted">
                <Twitter className="w-4 h-4" /> Twitter
              </Button>
              <Button variant="outline" onClick={shareWhatsApp} className="gap-1.5 text-xs rounded-xl border-0 bg-muted/80 hover:bg-muted">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// Podium slot sub-component
function PodiumSlot({ entry, position, height, delay, isFirst }: { entry: LeaderboardEntry; position: number; height: string; delay: number; isFirst?: boolean }) {
  const medals = ["", "🥇", "🥈", "🥉"];
  const bgColors = ["", "bg-gradient-to-t from-yellow-400/20 to-yellow-300/5", "bg-gradient-to-t from-slate-300/20 to-slate-200/5", "bg-gradient-to-t from-amber-500/15 to-amber-400/5"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 200 }}
      className="flex flex-col items-center gap-1.5 w-24"
    >
      <Avatar className={`${isFirst ? "w-14 h-14 ring-2 ring-yellow-400/50" : "w-11 h-11"}`}>
        <AvatarFallback className={`text-xs font-bold ${entry.isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          {entry.avatar}
        </AvatarFallback>
      </Avatar>
      <p className={`text-[11px] font-bold truncate w-full text-center ${entry.isUser ? "text-primary" : "text-foreground"}`}>
        {entry.isUser ? "Tú" : entry.name.split(" ")[0]}
      </p>
      <div className={`${height} w-full rounded-t-xl ${bgColors[position]} flex flex-col items-center justify-center border border-border/50`}>
        <span className="text-xl">{medals[position]}</span>
        <p className="text-xs font-black text-foreground">{entry.weeklyKg.toFixed(1)}</p>
        <p className="text-[8px] text-muted-foreground">kg CO₂</p>
      </div>
    </motion.div>
  );
}
