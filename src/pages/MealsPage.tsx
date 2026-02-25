import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Utensils, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FOOD_FACTORS, calcMealCarbon } from "@/lib/carbon";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";

interface Meal {
  id: string;
  meal_type: string;
  description: string;
  carbon_kg: number;
  date: string;
}

export default function MealsPage() {
  const { user } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [open, setOpen] = useState(false);
  const [foodType, setFoodType] = useState("vegetarian");
  const [mealType, setMealType] = useState("lunch");
  const [description, setDescription] = useState("");

  const fetchMeals = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("meals")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(20);
    setMeals((data as Meal[]) ?? []);
  };

  useEffect(() => { fetchMeals(); }, [user]);

  const handleAdd = async () => {
    if (!user) return;
    const carbon = calcMealCarbon(foodType);
    const label = FOOD_FACTORS[foodType]?.label ?? foodType;
    const desc = description.trim() || label;

    const { error } = await supabase.from("meals").insert({
      user_id: user.id,
      meal_type: mealType,
      description: desc,
      carbon_kg: carbon,
    });

    if (error) {
      toast.error("Error al registrar comida");
      return;
    }
    toast.success(`${desc} registrada (${carbon} kg CO₂)`);
    setOpen(false);
    setDescription("");
    fetchMeals();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("meals").delete().eq("id", id);
    fetchMeals();
  };

  const mealTypeLabels: Record<string, string> = {
    breakfast: "Desayuno", lunch: "Almuerzo", dinner: "Cena", snack: "Snack",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Comidas</h1>
          <p className="text-sm text-muted-foreground">Registra lo que comes</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> Añadir
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Registrar comida</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Tipo de comida</Label>
                <Select value={mealType} onValueChange={setMealType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(mealTypeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de alimento</Label>
                <Select value={foodType} onValueChange={setFoodType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FOOD_FACTORS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label} ({v.factor} kg CO₂)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descripción (opcional)</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Ensalada con pollo" />
              </div>
              <Button className="w-full" onClick={handleAdd}>
                Registrar ({calcMealCarbon(foodType)} kg CO₂)
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {meals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Utensils className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No has registrado comidas aún</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {meals.map((meal, i) => (
            <motion.div key={meal.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-accent/30 flex items-center justify-center">
                      <Utensils className="w-4 h-4 text-earth" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{meal.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {mealTypeLabels[meal.meal_type] ?? meal.meal_type} · {format(new Date(meal.date), "dd MMM")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-primary">{Number(meal.carbon_kg).toFixed(1)} kg</span>
                    <button onClick={() => handleDelete(meal.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
