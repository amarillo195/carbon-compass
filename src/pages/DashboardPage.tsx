import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Flame, Utensils, MapPin, TrendingDown, Calendar, ChevronLeft, ChevronRight, Zap, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { startOfWeek, endOfWeek, format, eachDayOfInterval, addWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const DAILY_GOAL_KG = 14;

function generateTip(todayMeals: number, todayTrips: number, weeklyData: { day: string; meals: number; trips: number }[]): string {
  const totalToday = todayMeals + todayTrips;
  const weekTotal = weeklyData.reduce((s, d) => s + d.meals + d.trips, 0);
  const weekMeals = weeklyData.reduce((s, d) => s + d.meals, 0);
  const weekTrips = weeklyData.reduce((s, d) => s + d.trips, 0);

  if (totalToday === 0 && weekTotal === 0) return "¡Empieza a registrar tus comidas y viajes para recibir consejos personalizados!";
  if (todayMeals > todayTrips && todayMeals > 3) return `Tu alimentación hoy generó ${todayMeals.toFixed(1)} kg CO₂. Intenta sustituir una comida con carne por una opción vegetariana y podrías ahorrar ~2 kg.`;
  if (todayTrips > todayMeals && todayTrips > 3) return `Tu transporte hoy generó ${todayTrips.toFixed(1)} kg CO₂. Considera usar transporte público o bicicleta para trayectos cortos.`;
  if (weekTrips > weekMeals && weekTrips > 10) return `Esta semana el transporte es tu mayor fuente (${weekTrips.toFixed(1)} kg). Compartir auto o usar tren reduce hasta un 80% las emisiones.`;
  if (weekMeals > weekTrips && weekMeals > 10) return `La alimentación representa ${weekMeals.toFixed(1)} kg esta semana. Un día vegano a la semana puede ahorrar ~6 kg CO₂ semanales.`;
  if (totalToday > DAILY_GOAL_KG) return `Hoy superaste tu meta diaria por ${(totalToday - DAILY_GOAL_KG).toFixed(1)} kg. Mañana intenta reducir el uso del auto o elige alimentos de menor impacto.`;
  if (totalToday > 0 && totalToday <= DAILY_GOAL_KG) return `¡Vas bien! Llevas ${totalToday.toFixed(1)} kg de ${DAILY_GOAL_KG} kg. Mantén hábitos como caminar o comer vegetariano para seguir así.`;
  return "Registra tus actividades del día para ver cómo impactas al planeta y recibir consejos útiles.";
}

// Circular progress component
function CircularProgress({ value, size = 140, strokeWidth = 10 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedValue = Math.min(value, 100);
  const offset = circumference - (clampedValue / 100) * circumference;
  const isOver = value > 100;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={isOver ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
        strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={circumference}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
    </svg>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [todayMeals, setTodayMeals] = useState(0);
  const [todayTrips, setTodayTrips] = useState(0);
  const [weeklyData, setWeeklyData] = useState<{ day: string; meals: number; trips: number; total: number }[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);

  const currentWeekStart = useMemo(() => addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset), [weekOffset]);
  const currentWeekEnd = useMemo(() => endOfWeek(currentWeekStart, { weekStartsOn: 1 }), [currentWeekStart]);

  const weekLabel = useMemo(() => {
    if (weekOffset === 0) return "Esta semana";
    if (weekOffset === -1) return "Semana pasada";
    return `Semana del ${format(currentWeekStart, "dd MMM", { locale: es })}`;
  }, [weekOffset, currentWeekStart]);

  useEffect(() => {
    if (!user) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const fetchToday = async () => {
      const [mealsRes, tripsRes] = await Promise.all([
        supabase.from("meals").select("carbon_kg").eq("user_id", user.id).eq("date", today),
        supabase.from("trips").select("carbon_kg").eq("user_id", user.id).eq("date", today),
      ]);
      setTodayMeals((mealsRes.data ?? []).reduce((s, m) => s + Number(m.carbon_kg), 0));
      setTodayTrips((tripsRes.data ?? []).reduce((s, t) => s + Number(t.carbon_kg), 0));
    };
    fetchToday();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const ws = format(currentWeekStart, "yyyy-MM-dd");
    const we = format(currentWeekEnd, "yyyy-MM-dd");
    const fetchWeek = async () => {
      const [weekMealsRes, weekTripsRes] = await Promise.all([
        supabase.from("meals").select("carbon_kg, date").eq("user_id", user.id).gte("date", ws).lte("date", we),
        supabase.from("trips").select("carbon_kg, date").eq("user_id", user.id).gte("date", ws).lte("date", we),
      ]);
      const days = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });
      const weekly = days.map((d) => {
        const dateStr = format(d, "yyyy-MM-dd");
        const dayMeals = (weekMealsRes.data ?? []).filter((m) => m.date === dateStr).reduce((s, m) => s + Number(m.carbon_kg), 0);
        const dayTrips = (weekTripsRes.data ?? []).filter((t) => t.date === dateStr).reduce((s, t) => s + Number(t.carbon_kg), 0);
        return { day: format(d, "EEE", { locale: es }), meals: Number(dayMeals.toFixed(1)), trips: Number(dayTrips.toFixed(1)), total: Number((dayMeals + dayTrips).toFixed(1)) };
      });
      setWeeklyData(weekly);
    };
    fetchWeek();
  }, [user, currentWeekStart, currentWeekEnd]);

  const totalToday = todayMeals + todayTrips;
  const progress = Math.min((totalToday / DAILY_GOAL_KG) * 100, 150);
  const tip = generateTip(todayMeals, todayTrips, weeklyData);
  const weekTotal = weeklyData.reduce((s, d) => s + d.total, 0);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-muted-foreground text-sm">Buenos días 👋</p>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
          {user?.user_metadata?.name?.split(" ")[0] || "Eco"}
        </h1>
      </motion.div>

      {/* Hero Card — Circular Progress */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, type: "spring" }}>
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary/10 via-card to-leaf-light/20">
          <CardContent className="p-6 flex items-center gap-6">
            <div className="relative flex-shrink-0">
              <CircularProgress value={(totalToday / DAILY_GOAL_KG) * 100} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-foreground leading-none">{totalToday.toFixed(1)}</span>
                <span className="text-[10px] text-muted-foreground font-medium mt-0.5">kg CO₂</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary">Meta diaria: {DAILY_GOAL_KG} kg</span>
              </div>
              <p className="text-sm text-muted-foreground leading-snug">
                {progress < 100
                  ? <>Te quedan <span className="font-bold text-foreground">{(DAILY_GOAL_KG - totalToday).toFixed(1)} kg</span> para tu meta</>
                  : <span className="font-bold text-destructive">⚠️ Meta superada</span>
                }
              </p>
              {/* Mini breakdown */}
              <div className="flex gap-3">
                <div className="flex items-center gap-1.5 bg-primary/10 rounded-full px-2.5 py-1">
                  <Utensils className="w-3 h-3 text-primary" />
                  <span className="text-xs font-semibold text-primary">{todayMeals.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-sky/10 rounded-full px-2.5 py-1">
                  <MapPin className="w-3 h-3 text-sky" />
                  <span className="text-xs font-semibold text-sky">{todayTrips.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 to-primary/10 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 text-center space-y-2">
              <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
                <Utensils className="w-5 h-5 text-primary" />
              </div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Comidas</p>
              <p className="text-2xl font-black text-foreground">{todayMeals.toFixed(1)}<span className="text-xs font-medium text-muted-foreground ml-1">kg</span></p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-0 shadow-md bg-gradient-to-br from-sky/5 to-sky/10 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 text-center space-y-2">
              <div className="w-11 h-11 rounded-2xl bg-sky/15 flex items-center justify-center mx-auto">
                <MapPin className="w-5 h-5 text-sky" />
              </div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Transporte</p>
              <p className="text-2xl font-black text-foreground">{todayTrips.toFixed(1)}<span className="text-xs font-medium text-muted-foreground ml-1">kg</span></p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Weekly Chart */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-0 shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-accent/30 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-earth" />
                </div>
                <div>
                  <span className="font-bold text-foreground text-sm">{weekLabel}</span>
                  <p className="text-[10px] text-muted-foreground">{weekTotal.toFixed(1)} kg total</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setWeekOffset((o) => o - 1)} disabled={weekOffset <= -4}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 rounded-full" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
                  Hoy
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setWeekOffset((o) => o + 1)} disabled={weekOffset >= 0}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-4 mb-3 text-[11px]">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Comidas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-sky" />
                <span className="text-muted-foreground">Transporte</span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyData} barGap={1}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12, boxShadow: "0 8px 30px -10px rgba(0,0,0,0.15)" }}
                  formatter={(value: number, name: string) => [`${value} kg`, name === "meals" ? "Comidas" : "Transporte"]}
                />
                <ReferenceLine y={DAILY_GOAL_KG} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: "Meta", position: "right", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Bar dataKey="meals" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                <Bar dataKey="trips" stackId="a" fill="hsl(var(--sky))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-3 flex justify-center gap-4 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Promedio: <span className="font-bold text-foreground">{weeklyData.length > 0 ? (weekTotal / weeklyData.length).toFixed(1) : "0"} kg/día</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Dynamic Tip */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="border-0 shadow-md bg-gradient-to-r from-leaf-light/50 to-leaf-light/20 overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-leaf/10" />
          <div className="absolute -right-2 -bottom-6 w-14 h-14 rounded-full bg-primary/10" />
          <CardContent className="p-4 flex items-start gap-3 relative">
            <div className="w-9 h-9 rounded-xl bg-leaf/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <TrendingDown className="w-4 h-4 text-leaf" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">💡 Consejo del día</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tip}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
