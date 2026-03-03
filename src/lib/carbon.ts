// Carbon emission factors (kg CO₂ per unit)
export const FOOD_FACTORS: Record<string, { label: string; factor: number }> = {
  beef: { label: "Carne de res", factor: 6.5 },
  chicken: { label: "Pollo", factor: 2.0 },
  pork: { label: "Cerdo", factor: 3.5 },
  fish: { label: "Pescado", factor: 1.5 },
  shrimp: { label: "Camarones", factor: 4.0 },
  eggs: { label: "Huevos", factor: 1.6 },
  cheese: { label: "Queso", factor: 3.2 },
  milk: { label: "Leche", factor: 1.0 },
  yogurt: { label: "Yogur", factor: 0.9 },
  butter: { label: "Mantequilla", factor: 3.5 },
  rice: { label: "Arroz", factor: 0.8 },
  pasta: { label: "Pasta", factor: 0.6 },
  bread: { label: "Pan", factor: 0.5 },
  beans: { label: "Frijoles/Lentejas", factor: 0.4 },
  tofu: { label: "Tofu", factor: 0.7 },
  vegetables: { label: "Verduras", factor: 0.2 },
  fruits: { label: "Frutas", factor: 0.3 },
  nuts: { label: "Frutos secos", factor: 0.8 },
  coffee: { label: "Café", factor: 0.6 },
  chocolate: { label: "Chocolate", factor: 2.3 },
  vegetarian: { label: "Plato vegetariano", factor: 0.5 },
  vegan: { label: "Plato vegano", factor: 0.3 },
  dairy: { label: "Lácteos (otro)", factor: 1.2 },
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
