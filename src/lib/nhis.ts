export interface NHISMedicineEntry {
  code: string;
  name: string;
  level: string;
  price: number;
}

const NHIS_MEDICINES: NHISMedicineEntry[] = [
  { code: 'ACETYLDT1', name: 'Acetylsalicylic Acid Tablet, 75 mg (Dispersible)', level: 'B2', price: 0.33 },
  { code: 'ACICLOSU2', name: 'Acyclovir Suspension, 200 mg/5 mL', level: 'B2', price: 276.91 },
  { code: 'ACICLOTA1', name: 'Acyclovir Tablet, 200 mg', level: 'B2', price: 1.98 },
  { code: 'AMINOPIN1', name: 'Aminophylline Injection, 250 mg/10 mL', level: 'B2', price: 11.55 },
  { code: 'AMITRITA2', name: 'Amitriptyline Tablet, 25 mg', level: 'B2', price: 0.18 },
  { code: 'AMLODITA2', name: 'Amlodipine Tablet, 10 mg', level: 'B1', price: 0.12 },
  { code: 'COAMOXIN1', name: 'Amoxicillin + Clavulanic Acid Injection, 500 mg + 100 mg', level: 'B2', price: 18.70 },
  { code: 'COAMOXTA2', name: 'Amoxicillin + Clavulanic Acid Tablet, 875 mg + 125 mg', level: 'B2', price: 2.98 },
  { code: 'AMOXICDT1', name: 'Amoxicillin 250 mg Dispersible Tablet', level: 'A', price: 1.87 },
  { code: 'AMOXICCA1', name: 'Amoxicillin Capsule, 250 mg', level: 'A', price: 0.47 },
  { code: 'AMOXICCA2', name: 'Amoxicillin Capsule, 500 mg', level: 'A', price: 0.83 },
  { code: 'AMOXICSU1', name: 'Amoxicillin Suspension, 125 mg/5 mL', level: 'A', price: 16.50 },
  { code: 'AMPICIIN1', name: 'Ampicillin Injection, 500 mg', level: 'B1', price: 3.85 },
  { code: 'ANTESEIN1', name: 'Anti Tetanus Serum Injection, 1500 IU', level: 'B1', price: 42.85 },
  { code: 'AQUEOUCR1', name: 'Aqueous Cream BP 100 G', level: 'A', price: 29.98 },
  { code: 'ARTEMEIN2', name: 'Artemether Injection 80mg/mL', level: 'B2', price: 5.50 },
  { code: 'ARTESUIN3', name: 'Artesunate injection 120mg', level: 'B2', price: 6.25 },
  { code: 'ATEHYDTA2', name: 'Atenolol + Hydrochlorothiazide Tablet, 100 mg + 25 mg', level: 'B2', price: 1.20 },
  { code: 'ATEHYDTA1', name: 'Atenolol + Hydrochlorothiazide Tablet, 50 mg + 25 mg', level: 'B2', price: 0.77 },
  { code: 'ATENOLTA1', name: 'Atenolol Tablet, 25 mg', level: 'B2', price: 1.10 },
  { code: 'ATENOLTA2', name: 'Atenolol Tablet, 50 mg', level: 'B2', price: 0.54 },
  { code: 'ATENOLTA3', name: 'Atenolol Tablet, 100 mg', level: 'B2', price: 1.10 },
];

export const B2_ALLOWED_LEVELS = ['a', 'b1', 'b2'];

export function normalizeNHISText(value: string): string {
  return String(value || '').trim().toLowerCase();
}

export function isLevelAllowedAtB2(level?: string): boolean {
  return B2_ALLOWED_LEVELS.includes(normalizeNHISText(level));
}

export function findNHISMedicine(query: string): NHISMedicineEntry | null {
  const needle = normalizeNHISText(query);
  if (!needle) return null;

  const direct = NHIS_MEDICINES.find(item => normalizeNHISText(item.code) === needle);
  if (direct) return direct;

  return NHIS_MEDICINES.find(item => {
    const name = normalizeNHISText(item.name);
    return name.includes(needle) || needle.includes(name) || name.replace(/[^a-z0-9]/g, '').includes(needle.replace(/[^a-z0-9]/g, ''));
  }) || null;
}

export function buildClaimItemFromMedication(med: any) {
  const name = String(med.drug_name || med.name || 'Unknown medication').trim();
  const quantity = Number(med.quantity || med.qty || med.amount || 1);
  const unit_price = Number(med.unit_price || med.price || 0);
  const amount = Number(med.amount || unit_price * quantity || 0);
  const matched = findNHISMedicine(name);
  const level = matched?.level || '';
  const isListed = Boolean(matched);
  const allowed = isListed ? isLevelAllowedAtB2(level) : false;
  const description = matched ? matched.name : name;

  const validation_notes: string[] = [];
  if (!isListed) validation_notes.push('Medicine not found in known NHIS 2025 list.');
  if (!allowed) validation_notes.push('Item is not claimable at B2 facility level.');
  if (!quantity || quantity <= 0) validation_notes.push('Quantity is missing or invalid.');
  if (!unit_price || unit_price <= 0) validation_notes.push('Unit price is missing or zero.');

  return {
    code: matched?.code || '',
    description,
    category: 'medicine',
    quantity: quantity || 1,
    unit_price: unit_price || 0,
    amount: amount || 0,
    prescribing_level: level,
    nhis_listed: isListed,
    claimable: isListed && allowed,
    validation_notes,
  };
}

export function buildClaimItemsFromPrescriptions(prescriptions: any[]) {
  const meds = Array.isArray(prescriptions) ? prescriptions.flatMap((rx: any) => Array.isArray(rx.medications) ? rx.medications : []) : [];
  const items = meds.map((med: any) => buildClaimItemFromMedication(med));
  if (items.length === 0) {
    items.push({
      code: '',
      description: 'Consultation service (no medication provided)',
      category: 'service',
      quantity: 1,
      unit_price: 0,
      amount: 0,
      prescribing_level: 'B2',
      nhis_listed: true,
      claimable: true,
      validation_notes: ['No medication items were available for this claim.'],
    });
  }
  return items;
}

export function buildSupportingDocuments(prescriptions: any[], labResults: any[]) {
  return [
    {
      type: 'prescription',
      description: 'Prescribed drugs available for claim review',
      attached: Array.isArray(prescriptions) && prescriptions.length > 0,
    },
    {
      type: 'lab_results',
      description: 'Lab results attached where available',
      attached: Array.isArray(labResults) && labResults.length > 0,
    },
  ];
}
