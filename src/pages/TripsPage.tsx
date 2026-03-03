import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, MapPin, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TRANSPORT_FACTORS, calcTripCarbon } from "@/lib/carbon";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";

interface Trip {
  id: string;
  transport_type: string;
  distance_km: number;
  description: string | null;
  carbon_kg: number;
  date: string;
}

export default function TripsPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [open, setOpen] = useState(false);
  const [transportType, setTransportType] = useState("car");
  const [distance, setDistance] = useState("");
  const [description, setDescription] = useState("");

  const fetchTrips = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("trips")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(20);
    setTrips((data as Trip[]) ?? []);
  };

  useEffect(() => { fetchTrips(); }, [user]);

  const handleAdd = async () => {
    if (!user) return;
    const km = parseFloat(distance);
    if (isNaN(km) || km <= 0) {
      toast.error("Ingresa una distancia válida");
      return;
    }
    const carbon = calcTripCarbon(transportType, km);
    const label = TRANSPORT_FACTORS[transportType]?.label ?? transportType;
    const desc = description.trim() || `${label} ${km} km`;

    const { error } = await supabase.from("trips").insert({
      user_id: user.id,
      transport_type: transportType,
      distance_km: km,
      description: desc,
      carbon_kg: carbon,
    });

    if (error) {
      toast.error("Error al registrar viaje");
      return;
    }
    toast.success(`${desc} registrado (${carbon} kg CO₂)`);
    setOpen(false);
    setDistance("");
    setDescription("");
    fetchTrips();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("trips").delete().eq("id", id);
    fetchTrips();
  };

  const previewCarbon = distance ? calcTripCarbon(transportType, parseFloat(distance) || 0) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Viajes</h1>
          <p className="text-sm text-muted-foreground">Registra tus trayectos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> Añadir
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Registrar viaje</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Medio de transporte</Label>
                <Select value={transportType} onValueChange={setTransportType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRANSPORT_FACTORS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label} ({v.factor} kg CO₂/km)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Distancia (km)</Label>
                <Input type="number" min="0" step="0.1" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="Ej: 15" />
              </div>
              <div>
                <Label>Descripción (opcional)</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Casa al trabajo" />
              </div>
              <Button className="w-full" onClick={handleAdd}>
                Registrar ({previewCarbon.toFixed(2)} kg CO₂)
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {trips.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No has registrado viajes aún</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {trips.map((trip, i) => (
            <motion.div key={trip.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-sky/10 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-sky" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{trip.description ?? `${TRANSPORT_FACTORS[trip.transport_type]?.label}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {Number(trip.carbon_kg).toFixed(2)} kg CO₂ · {format(new Date(trip.date), "dd MMM")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-primary">{Number(trip.distance_km).toFixed(1)} km</span>
                    <button onClick={() => handleDelete(trip.id)} className="text-muted-foreground hover:text-destructive transition-colors">
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
