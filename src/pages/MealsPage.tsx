import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Utensils, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FOOD_FACTORS, calcMealCarbon } from "@/lib/carbon";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [mealType, setMealType] = useState("lunch");
  const [description, setDescription] = useState("");
  const [currentFood, setCurrentFood] = useState("");

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

  const addFood = (food: string) => {
    if (food && !selectedFoods.includes(food)) {
      setSelectedFoods([...selectedFoods, food]);
    }
    setCurrentFood("");
  };

  const removeFood = (food: string) => {
    setSelectedFoods(selectedFoods.filter((f) => f !== food));
  };

  const totalCarbon = selectedFoods.reduce((sum, f) => sum + calcMealCarbon(f), 0);

  const handleAdd = async () => {
    if (!user) return;
    if (selectedFoods.length === 0) {
      toast.error("Selecciona al menos un alimento");
      return;
    }

    const labels = selectedFoods.map((f) => FOOD_FACTORS[f]?.label ?? f).join(", ");
    const desc = description.trim() || labels;

    const { error } = await supabase.from("meals").insert({
      user_id: user.id,
      meal_type: mealType,
      description: desc,
      carbon_kg: Number(totalCarbon.toFixed(2)),
    });

    if (error) {
      toast.error("Error al registrar comida");
      return;
    }
    toast.success(`${desc} registrada (${totalCarbon.toFixed(2)} kg CO₂)`);
    setOpen(false);
    setDescription("");
    setSelectedFoods([]);
    fetchMeals();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("meals").delete().eq("id", id);
    fetchMeals();
  };

  const mealTypeLabels: Record<string, string> = {
    breakfast: "Desayuno", lunch: "Almuerzo", dinner: "Cena", snack: "Snack",
  };

  const availableFoods = Object.entries(FOOD_FACTORS).filter(([k]) => !selectedFoods.includes(k));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Comidas</h1>
          <p className="text-sm text-muted-foreground">Registra lo que comes</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelectedFoods([]); setCurrentFood(""); } }}>
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
                <Label>Alimentos (selecciona varios)</Label>
                {selectedFoods.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
                    {selectedFoods.map((f) => (
                      <Badge key={f} variant="secondary" className="gap-1 pr-1">
                        {FOOD_FACTORS[f]?.label} ({FOOD_FACTORS[f]?.factor} kg)
                        <button onClick={() => removeFood(f)} className="ml-0.5 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                {availableFoods.length > 0 && (
                  <Select value={currentFood} onValueChange={addFood}>
                    <SelectTrigger>
                      <SelectValue placeholder="Agregar alimento..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFoods.map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v.label} ({v.factor} kg CO₂)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {selectedFoods.length > 0 && (
                <div className="rounded-lg bg-muted p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total estimado:</span>
                    <span className="font-bold text-primary">{totalCarbon.toFixed(2)} kg CO₂</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedFoods.map((f) => `${FOOD_FACTORS[f]?.label}: ${FOOD_FACTORS[f]?.factor}`).join(" + ")} = {totalCarbon.toFixed(2)}
                  </div>
                </div>
              )}

              <div>
                <Label>Descripción (opcional)</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Almuerzo en casa" />
              </div>
              <Button className="w-full" onClick={handleAdd} disabled={selectedFoods.length === 0}>
                Registrar ({totalCarbon.toFixed(2)} kg CO₂)
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
