import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Share2, Copy, Twitter, MessageCircle, Leaf, Trophy, Flame, Utensils, MapPin, Medal, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { startOfWeek, endOfWeek, format, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";

const DAILY_GOAL_KG = 14;

type RankTier = { label: string; icon: typeof Trophy; color: string; bg: string; min: number; max: number };

const RANK_TIERS: RankTier[] = [
  { label: "Eco Leyenda", icon: Trophy, color: "text-yellow-500", bg: "from-yellow-500/20 to-amber-400/10", min: 0, max: 20 },
  { label: "Guardián Verde", icon: Medal, color: "text-emerald-500", bg: "from-emerald-500/20 to-green-400/10", min: 20, max: 40 },
  { label: "Explorador Eco", icon: Star, color: "text-sky-500", bg: "from-sky-500/20 to-blue-400/10", min: 40, max: 65 },
  { label: "Aprendiz Verde", icon: Leaf, color: "text-lime-500", bg: "from-lime-500/20 to-green-300/10", min: 65, max: 90 },
  { label: "Novato Carbono", icon: Flame, color: "text-orange-500", bg: "from-orange-500/20 to-red-400/10", min: 90, max: Infinity },
];

function getRank(weeklyTotal: number, daysTracked: number): RankTier {
  const weeklyGoal = DAILY_GOAL_KG * 7;
  const pct = weeklyGoal > 0 ? (weeklyTotal / weeklyGoal) * 100 : 0;
  return RANK_TIERS.find((r) => pct >= r.min && pct < r.max) || RANK_TIERS[RANK_TIERS.length - 1];
}

export default function SharePage() {
  const { user } = useAuth();
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [mealCount, setMealCount] = useState(0);
  const [tripCount, setTripCount] = useState(0);
  const [mealCarbon, setMealCarbon] = useState(0);
  const [tripCarbon, setTripCarbon] = useState(0);
  const [daysTracked, setDaysTracked] = useState(0);
  const [bestDay, setBestDay] = useState<string | null>(null);
  const [bestDayTotal, setBestDayTotal] = useState(0);

  useEffect(() => {
    if (!user) return;
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const ws = format(weekStart, "yyyy-MM-dd");
    const we = format(weekEnd, "yyyy-MM-dd");

    const fetchData = async () => {
      const [mealsRes, tripsRes] = await Promise.all([
        supabase.from("meals").select("carbon_kg, date").eq("user_id", user.id).gte("date", ws).lte("date", we),
        supabase.from("trips").select("carbon_kg, date").eq("user_id", user.id).gte("date", ws).lte("date", we),
      ]);
      const meals = mealsRes.data ?? [];
      const trips = tripsRes.data ?? [];
      setMealCount(meals.length);
      setTripCount(trips.length);
      const mc = meals.reduce((s, r) => s + Number(r.carbon_kg), 0);
      const tc = trips.reduce((s, r) => s + Number(r.carbon_kg), 0);
      setMealCarbon(mc);
      setTripCarbon(tc);
      setWeeklyTotal(mc + tc);

      // Calculate days tracked & best day
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
      let tracked = 0;
      let minDay = "";
      let minTotal = Infinity;
      days.forEach((d) => {
        const ds = format(d, "yyyy-MM-dd");
        const dayMeals = meals.filter((m) => m.date === ds).reduce((s, m) => s + Number(m.carbon_kg), 0);
        const dayTrips = trips.filter((t) => t.date === ds).reduce((s, t) => s + Number(t.carbon_kg), 0);
        const dayTotal = dayMeals + dayTrips;
        if (dayTotal > 0) {
          tracked++;
          if (dayTotal < minTotal) {
            minTotal = dayTotal;
            minDay = ds;
          }
        }
      });
      setDaysTracked(tracked);
      if (minDay) {
        setBestDay(format(new Date(minDay + "T12:00:00"), "EEEE", { locale: es }));
        setBestDayTotal(minTotal);
      }
    };
    fetchData();
  }, [user]);

  const rank = getRank(weeklyTotal, daysTracked);
  const RankIcon = rank.icon;
  const weeklyGoal = DAILY_GOAL_KG * 7;
  const pct = weeklyGoal > 0 ? Math.min((weeklyTotal / weeklyGoal) * 100, 150) : 0;
  const avgDaily = daysTracked > 0 ? weeklyTotal / daysTracked : 0;

  const shareText = `🏆 Soy "${rank.label}" en EcoTrack!\n🌿 Mi huella esta semana: ${weeklyTotal.toFixed(1)} kg CO₂\n🍽️ ${mealCount} comidas (${mealCarbon.toFixed(1)} kg)\n🚗 ${tripCount} viajes (${tripCarbon.toFixed(1)} kg)\n📊 Promedio: ${avgDaily.toFixed(1)} kg/día\n¡Únete y mide tu impacto! 🌍`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareText);
    toast.success("¡Copiado al portapapeles!");
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Share2 className="w-5 h-5 text-primary" /> Compartir
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Tu ranking semanal</p>
      </div>

      {/* Rank Card */}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
        <Card className={`bg-gradient-to-br ${rank.bg} border-0 shadow-lg overflow-hidden relative`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
          <CardContent className="p-6 text-center space-y-3 relative">
            <motion.div
              initial={{ rotate: -20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-20 h-20 rounded-full bg-background/80 backdrop-blur flex items-center justify-center mx-auto shadow-md"
            >
              <RankIcon className={`w-10 h-10 ${rank.color}`} />
            </motion.div>
            <div>
              <p className={`text-2xl font-extrabold ${rank.color}`}>{rank.label}</p>
              <p className="text-xs text-muted-foreground mt-1">Ranking semanal EcoTrack</p>
            </div>
            <div className="text-4xl font-black text-foreground">
              {weeklyTotal.toFixed(1)} <span className="text-base font-normal text-muted-foreground">kg CO₂</span>
            </div>
            <div className="w-full bg-background/50 rounded-full h-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(pct, 100)}%` }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className={`h-full rounded-full ${pct <= 50 ? "bg-emerald-500" : pct <= 80 ? "bg-yellow-500" : "bg-orange-500"}`}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {pct.toFixed(0)}% de tu meta semanal ({weeklyGoal} kg)
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Utensils className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{mealCount} comidas</p>
                <p className="text-sm font-bold text-foreground">{mealCarbon.toFixed(1)} kg</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-sky" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{tripCount} viajes</p>
                <p className="text-sm font-bold text-foreground">{tripCarbon.toFixed(1)} kg</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent/30 flex items-center justify-center">
                <Flame className="w-4 h-4 text-earth" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Promedio diario</p>
                <p className="text-sm font-bold text-foreground">{avgDaily.toFixed(1)} kg</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-leaf-light/50 flex items-center justify-center">
                <Star className="w-4 h-4 text-leaf" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mejor día</p>
                <p className="text-sm font-bold text-foreground capitalize">
                  {bestDay ? `${bestDay} (${bestDayTotal.toFixed(1)})` : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Share Actions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-foreground mb-3 bg-muted/50 rounded-lg p-3 leading-relaxed whitespace-pre-line font-mono text-xs">
              {shareText}
            </p>
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
