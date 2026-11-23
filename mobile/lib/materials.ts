// Display names for the backend's material ids (the "material" in data/categories.json).

const LABELS: Record<string, string> = {
  plastic: "Plastic",
  paper: "Paper",
  metal: "Metal",
  glass: "Glass",
  electronics: "E-waste",
  hazardous: "Hazardous",
  organic: "Organics",
};

/** "electronics" -> "E-waste"; unknown ids are just capitalised. */
export function materialLabel(material: string): string {
  return LABELS[material] ?? material.charAt(0).toUpperCase() + material.slice(1);
}
