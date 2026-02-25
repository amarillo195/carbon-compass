import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Share2, Copy, Twitter, MessageCircle, Leaf } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { startOfWeek, endOfWeek, format } from "date-fns";

export default function SharePage() {
  const { user } = useAuth();
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [mealCount, setMealCount] = useState(0);
  const [tripCount, setTripCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

    const fetch = async () => {
      const [mealsRes, tripsRes] = await Promise.all([
        supabase.from("meals").select("carbon_kg").eq("user_id", user.id).gte("date", weekStart).lte("date", weekEnd),
        supabase.from("trips").select("carbon_kg").eq("user_id", user.id).gte("date", weekStart).lte("date", weekEnd),
      ]);
      const meals = mealsRes.data ?? [];
      const trips = tripsRes.data ?? [];
      setMealCount(meals.length);
      setTripCount(trips.length);
      const total = [...meals, ...trips].reduce((s, r) => s + Number(r.carbon_kg), 0);
      setWeeklyTotal(total);
    };
    fetch();
  }, [user]);

  const shareText = `🌿 Esta semana mi huella de carbono fue de ${weeklyTotal.toFixed(1)} kg CO₂ (${mealCount} comidas, ${tripCount} viajes registrados). ¡Estoy usando EcoTrack para reducir mi impacto! 🌍`;

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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Share2 className="w-5 h-5 text-primary" /> Compartir
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Inspira a tus amigos</p>
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="bg-gradient-to-br from-primary/5 to-leaf-light/30 border-primary/20">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Leaf className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{weeklyTotal.toFixed(1)} kg</p>
              <p className="text-sm text-muted-foreground">CO₂ esta semana</p>
            </div>
            <div className="flex justify-center gap-6 text-center">
              <div>
                <p className="text-lg font-bold text-foreground">{mealCount}</p>
                <p className="text-xs text-muted-foreground">comidas</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{tripCount}</p>
                <p className="text-xs text-muted-foreground">viajes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-foreground mb-4 bg-muted/50 rounded-lg p-3 leading-relaxed">{shareText}</p>
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
    </div>
  );
}
