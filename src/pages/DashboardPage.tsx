import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Utensils, MapPin, TrendingDown, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { startOfWeek, endOfWeek, format, eachDayOfInterval, isToday } from "date-fns";
import { es } from "date-fns/locale";

const DAILY_GOAL_KG = 8; // average daily carbon target

export default function DashboardPage() {
  const { user } = useAuth();
  const [todayMeals, setTodayMeals] = useState(0);
  const [todayTrips, setTodayTrips] = useState(0);
  const [weeklyData, setWeeklyData] = useState<{ day: string; total: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

    const fetchData = async () => {
      const [mealsRes, tripsRes, weekMealsRes, weekTripsRes] = await Promise.all([
        supabase.from("meals").select("carbon_kg").eq("user_id", user.id).eq("date", today),
        supabase.from("trips").select("carbon_kg").eq("user_id", user.id).eq("date", today),
        supabase.from("meals").select("carbon_kg, date").eq("user_id", user.id).gte("date", weekStart).lte("date", weekEnd),
        supabase.from("trips").select("carbon_kg, date").eq("user_id", user.id).gte("date", weekStart).lte("date", weekEnd),
      ]);

      const mealTotal = (mealsRes.data ?? []).reduce((s, m) => s + Number(m.carbon_kg), 0);
      const tripTotal = (tripsRes.data ?? []).reduce((s, t) => s + Number(t.carbon_kg), 0);
      setTodayMeals(mealTotal);
      setTodayTrips(tripTotal);

      // Build weekly chart
      const days = eachDayOfInterval({
        start: startOfWeek(new Date(), { weekStartsOn: 1 }),
        end: endOfWeek(new Date(), { weekStartsOn: 1 }),
      });

      const weekly = days.map((d) => {
        const dateStr = format(d, "yyyy-MM-dd");
        const dayMeals = (weekMealsRes.data ?? []).filter((m) => m.date === dateStr).reduce((s, m) => s + Number(m.carbon_kg), 0);
        const dayTrips = (weekTripsRes.data ?? []).filter((t) => t.date === dateStr).reduce((s, t) => s + Number(t.carbon_kg), 0);
        return { day: format(d, "EEE", { locale: es }), total: dayMeals + dayTrips };
      });
      setWeeklyData(weekly);
    };

    fetchData();
  }, [user]);

  const totalToday = todayMeals + todayTrips;
  const progress = Math.min((totalToday / DAILY_GOAL_KG) * 100, 100);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">
          ¡Hola, {user?.user_metadata?.name?.split(" ")[0] || "Eco"}! 🌿
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Tu resumen de hoy</p>
      </motion.div>

      {/* Today's total */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-leaf-light/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">Huella de hoy</span>
              </div>
              <span className="text-xs text-muted-foreground">Meta: {DAILY_GOAL_KG} kg</span>
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">
              {totalToday.toFixed(1)} <span className="text-base font-normal text-muted-foreground">kg CO₂</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {progress < 100 ? `${(DAILY_GOAL_KG - totalToday).toFixed(1)} kg restantes` : "⚠️ Meta excedida"}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/30 flex items-center justify-center">
                <Utensils className="w-5 h-5 text-earth" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Comidas</p>
                <p className="text-lg font-bold text-foreground">{todayMeals.toFixed(1)} kg</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-sky" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transporte</p>
                <p className="text-lg font-bold text-foreground">{todayTrips.toFixed(1)} kg</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Weekly chart */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground text-sm">Resumen semanal</span>
            </div>
            <div className="flex items-end justify-between gap-1 h-32">
              {weeklyData.map(({ day, total }, i) => {
                const maxH = Math.max(...weeklyData.map((d) => d.total), DAILY_GOAL_KG);
                const h = maxH > 0 ? (total / maxH) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground font-medium">{total > 0 ? total.toFixed(1) : ""}</span>
                    <div
                      className="w-full rounded-t-md bg-primary/20 relative overflow-hidden"
                      style={{ height: `${Math.max(h, 4)}%` }}
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-md transition-all"
                        style={{ height: `${Math.min((total / DAILY_GOAL_KG) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground capitalize">{day}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick tip */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="bg-leaf-light/40 border-leaf/20">
          <CardContent className="p-4 flex items-start gap-3">
            <TrendingDown className="w-5 h-5 text-leaf mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Consejo rápido</p>
              <p className="text-xs text-muted-foreground mt-1">
                Reemplaza una comida con carne por una vegetariana y ahorra ~2 kg de CO₂.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
