// Carbon emission factors (kg CO₂ per unit)
export const FOOD_FACTORS: Record<string, { label: string; factor: number }> = {
  beef: { label: "Carne de res", factor: 6.5 },
  chicken: { label: "Pollo", factor: 2.0 },
  pork: { label: "Cerdo", factor: 3.5 },
  fish: { label: "Pescado", factor: 1.5 },
  vegetarian: { label: "Vegetariano", factor: 0.5 },
  vegan: { label: "Vegano", factor: 0.3 },
  dairy: { label: "Lácteos", factor: 1.2 },
  rice: { label: "Arroz", factor: 0.8 },
};

// kg CO₂ per km
export const TRANSPORT_FACTORS: Record<string, { label: string; factor: number; icon: string }> = {
  car: { label: "Auto", factor: 0.21, icon: "car" },
  bus: { label: "Autobús", factor: 0.089, icon: "bus" },
  train: { label: "Tren", factor: 0.041, icon: "train-front" },
  bike: { label: "Bicicleta", factor: 0, icon: "bike" },
  walk: { label: "Caminando", factor: 0, icon: "footprints" },
  plane: { label: "Avión", factor: 0.255, icon: "plane" },
  motorcycle: { label: "Moto", factor: 0.103, icon: "bike" },
};

export function calcMealCarbon(foodType: string): number {
  return FOOD_FACTORS[foodType]?.factor ?? 1.0;
}

export function calcTripCarbon(transportType: string, distanceKm: number): number {
  const factor = TRANSPORT_FACTORS[transportType]?.factor ?? 0.15;
  return Number((factor * distanceKm).toFixed(3));
}
