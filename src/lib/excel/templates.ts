import * as XLSX from "xlsx";

export type EntityKind = "clients" | "vehicules" | "contrats" | "paiements" | "sinistres";

export const TEMPLATE_COLUMNS: Record<EntityKind, { key: string; label: string; required?: boolean }[]> = {
  clients: [
    { key: "full_name", label: "Nom complet", required: true },
    { key: "email", label: "Email" },
    { key: "phone", label: "Téléphone" },
    { key: "address", label: "Adresse" },
    { key: "id_number", label: "N° pièce identité" },
    { key: "date_of_birth", label: "Date naissance (AAAA-MM-JJ)" },
    { key: "profession", label: "Profession" },
    { key: "kind", label: "Type (personne_physique|personne_morale)" },
  ],
  vehicules: [
    { key: "client_email", label: "Email client (existant)", required: true },
    { key: "registration", label: "Immatriculation", required: true },
    { key: "brand", label: "Marque" },
    { key: "model", label: "Modèle" },
    { key: "energy", label: "Énergie" },
    { key: "fiscal_power", label: "Puissance CV" },
    { key: "seats", label: "Places" },
    { key: "vin", label: "VIN" },
    { key: "first_registration_date", label: "1ère mise en circulation (AAAA-MM-JJ)" },
    { key: "new_value", label: "Valeur neuve" },
    { key: "market_value", label: "Valeur vénale" },
  ],
  contrats: [
    { key: "contract_number", label: "Numéro" },
    { key: "client_email", label: "Email client" },
    { key: "type", label: "Type (auto|voyage|risques_divers)" },
    { key: "start_date", label: "Début (AAAA-MM-JJ)" },
    { key: "end_date", label: "Fin (AAAA-MM-JJ)" },
    { key: "total_premium", label: "Prime totale" },
    { key: "status", label: "Statut" },
  ],
  paiements: [
    { key: "contract_number", label: "N° contrat" },
    { key: "amount", label: "Montant", required: true },
    { key: "method", label: "Méthode (mobile_money_mtn|virement|especes|cheque|carte|mobile_money_orange)", required: true },
    { key: "status", label: "Statut (paye|en_attente|echoue|rembourse)" },
    { key: "external_reference", label: "Référence externe" },
    { key: "paid_at", label: "Payé le (AAAA-MM-JJ)" },
  ],
  sinistres: [
    { key: "contract_number", label: "N° contrat", required: true },
    { key: "occurred_at", label: "Date sinistre (AAAA-MM-JJ)", required: true },
    { key: "description", label: "Description" },
    { key: "estimated_amount", label: "Montant estimé" },
    { key: "status", label: "Statut" },
  ],
};

export function downloadTemplate(kind: EntityKind) {
  const cols = TEMPLATE_COLUMNS[kind];
  const headers = cols.map(c => c.label);
  const example = cols.map(() => "");
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, kind);
  XLSX.writeFile(wb, `template-${kind}.xlsx`);
}

export function parseExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        resolve(rows);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

export function rowsByLabel(rows: any[], kind: EntityKind): any[] {
  const cols = TEMPLATE_COLUMNS[kind];
  return rows.map(r => {
    const out: any = {};
    cols.forEach(c => {
      if (r[c.label] !== undefined && r[c.label] !== "") out[c.key] = r[c.label];
    });
    return out;
  });
}

export function exportToExcel<T extends Record<string, any>>(rows: T[], filename: string, sheetName = "Export") {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}