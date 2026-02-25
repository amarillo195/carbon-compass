import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lightbulb, Utensils, Bus, Zap, Leaf } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

interface Tip {
  id: string;
  title: string;
  content: string;
  category: string;
  icon: string;
}

const categoryIcons: Record<string, typeof Leaf> = {
  food: Utensils,
  transport: Bus,
  energy: Zap,
  general: Leaf,
};

const categoryColors: Record<string, string> = {
  food: "bg-accent/30 text-earth",
  transport: "bg-sky/10 text-sky",
  energy: "bg-primary/10 text-primary",
  general: "bg-leaf-light/50 text-leaf",
};

export default function TipsPage() {
  const [tips, setTips] = useState<Tip[]>([]);

  useEffect(() => {
    supabase.from("eco_tips").select("*").then(({ data }) => {
      setTips((data as Tip[]) ?? []);
    });
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-accent" /> Tips Ambientales
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Pequeñas acciones, gran impacto</p>
      </div>

      <div className="space-y-3">
        {tips.map((tip, i) => {
          const Icon = categoryIcons[tip.category] ?? Leaf;
          const colorClass = categoryColors[tip.category] ?? categoryColors.general;
          return (
            <motion.div key={tip.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{tip.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tip.content}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
