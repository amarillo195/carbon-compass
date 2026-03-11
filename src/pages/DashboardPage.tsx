import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Flame, Utensils, MapPin, TrendingDown, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { startOfWeek, endOfWeek, format, eachDayOfInterval, addWeeks, isThisWeek } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const DAILY_GOAL_KG = 14;

function generateTip(todayMeals: number, todayTrips: number, weeklyData: { day: string; meals: number; trips: number }[]): string {
  const totalToday = todayMeals + todayTrips;
  const weekTotal = weeklyData.reduce((s, d) => s + d.meals + d.trips, 0);
  const weekMeals = weeklyData.reduce((s, d) => s + d.meals, 0);
  const weekTrips = weeklyData.reduce((s, d) => s + d.trips, 0);

  if (totalToday === 0 && weekTotal === 0) {
    return "¡Empieza a registrar tus comidas y viajes para recibir consejos personalizados!";
  }

  if (todayMeals > todayTrips && todayMeals > 3) {
    return `Tu alimentación hoy generó ${todayMeals.toFixed(1)} kg CO₂. Intenta sustituir una comida con carne por una opción vegetariana y podrías ahorrar ~2 kg.`;
  }

  if (todayTrips > todayMeals && todayTrips > 3) {
    return `Tu transporte hoy generó ${todayTrips.toFixed(1)} kg CO₂. Considera usar transporte público o bicicleta para trayectos cortos.`;
  }

  if (weekTrips > weekMeals && weekTrips > 10) {
    return `Esta semana el transporte es tu mayor fuente (${weekTrips.toFixed(1)} kg). Compartir auto o usar tren reduce hasta un 80% las emisiones.`;
  }

  if (weekMeals > weekTrips && weekMeals > 10) {
    return `La alimentación representa ${weekMeals.toFixed(1)} kg esta semana. Un día vegano a la semana puede ahorrar ~6 kg CO₂ semanales.`;
  }

  if (totalToday > DAILY_GOAL_KG) {
    return `Hoy superaste tu meta diaria por ${(totalToday - DAILY_GOAL_KG).toFixed(1)} kg. Mañana intenta reducir el uso del auto o elige alimentos de menor impacto.`;
  }

  if (totalToday > 0 && totalToday <= DAILY_GOAL_KG) {
    return `¡Vas bien! Llevas ${totalToday.toFixed(1)} kg de ${DAILY_GOAL_KG} kg. Mantén hábitos como caminar o comer vegetariano para seguir así.`;
  }

  return "Registra tus actividades del día para ver cómo impactas al planeta y recibir consejos útiles.";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [todayMeals, setTodayMeals] = useState(0);
  const [todayTrips, setTodayTrips] = useState(0);
  const [weeklyData, setWeeklyData] = useState<{ day: string; meals: number; trips: number; total: number }[]>([]);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, -1 = last week, etc.

  const currentWeekStart = useMemo(() => addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset), [weekOffset]);
  const currentWeekEnd = useMemo(() => endOfWeek(currentWeekStart, { weekStartsOn: 1 }), [currentWeekStart]);

  const weekLabel = useMemo(() => {
    if (weekOffset === 0) return "Esta semana";
    if (weekOffset === -1) return "Semana pasada";
    if (weekOffset === -2) return "Hace 2 semanas";
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
        return {
          day: format(d, "EEE", { locale: es }),
          meals: Number(dayMeals.toFixed(1)),
          trips: Number(dayTrips.toFixed(1)),
          total: Number((dayMeals + dayTrips).toFixed(1)),
        };
      });
      setWeeklyData(weekly);
    };
    fetchWeek();
  }, [user, currentWeekStart, currentWeekEnd]);

  const totalToday = todayMeals + todayTrips;
  const progress = Math.min((totalToday / DAILY_GOAL_KG) * 100, 100);
  const tip = generateTip(todayMeals, todayTrips, weeklyData);
  const weekTotal = weeklyData.reduce((s, d) => s + d.total, 0);

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
              <span className="text-xs text-muted-foreground">Meta: {DAILY_GOAL_KG} kg CO₂</span>
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

      {/* Weekly chart with recharts */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground text-sm">{weekLabel}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset((o) => o - 1)} disabled={weekOffset <= -4}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
                  Hoy
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset((o) => o + 1)} disabled={weekOffset >= 0}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-3 mb-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-primary" />
                <span className="text-muted-foreground">Comidas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-sky" />
                <span className="text-muted-foreground">Transporte</span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyData} barGap={1}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number, name: string) => [`${value} kg`, name === "meals" ? "Comidas" : "Transporte"]}
                />
                <ReferenceLine y={DAILY_GOAL_KG} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: "Meta", position: "right", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Bar dataKey="meals" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                <Bar dataKey="trips" stackId="a" fill="hsl(var(--sky))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-3 text-xs text-muted-foreground text-center">
              Total: <span className="font-semibold text-foreground">{weekTotal.toFixed(1)} kg CO₂</span>
              {" · "}
              Promedio: <span className="font-semibold text-foreground">{weeklyData.length > 0 ? (weekTotal / weeklyData.length).toFixed(1) : "0"} kg/día</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Dynamic tip */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="bg-leaf-light/40 border-leaf/20">
          <CardContent className="p-4 flex items-start gap-3">
            <TrendingDown className="w-5 h-5 text-leaf mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Consejo personalizado</p>
              <p className="text-xs text-muted-foreground mt-1">{tip}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
