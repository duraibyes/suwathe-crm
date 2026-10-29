// Labels used across the app. Change wording here.

export const STATUSES = [
  { id: "new", en: "New", ta: "புதியது", tone: "bg-slate-100 text-slate-700" },
  { id: "contacted", en: "Contacted", ta: "பேசியாச்சு", tone: "bg-sky-100 text-sky-800" },
  { id: "meeting", en: "Meeting fixed", ta: "சந்திப்பு", tone: "bg-violet-100 text-violet-800" },
  { id: "quote", en: "Quote sent", ta: "விலை அனுப்பியாச்சு", tone: "bg-amber-100 text-amber-800" },
  { id: "later", en: "Follow up later", ta: "பிறகு பேசணும்", tone: "bg-orange-100 text-orange-800" },
  { id: "won", en: "Won", ta: "ஒப்பந்தம் ஆச்சு", tone: "bg-emerald-100 text-emerald-800" },
  { id: "lost", en: "Lost", ta: "வேண்டாம்", tone: "bg-rose-100 text-rose-700" },
] as const;
export type Status = (typeof STATUSES)[number]["id"];
export const OPEN_STATUSES = ["new", "contacted", "meeting", "quote", "later"];
export const status = (id: string) => STATUSES.find((s) => s.id === id) ?? STATUSES[0];

export const SOURCES = [
  { id: "google_maps", en: "Google Maps" },
  { id: "referral", en: "Referral" },
  { id: "walk_in", en: "Walk-in / visit" },
  { id: "cold_call", en: "Cold call / WhatsApp" },
  { id: "social", en: "Instagram / Facebook" },
  { id: "website", en: "Website enquiry" },
  { id: "ads", en: "Google Ads" },
  { id: "other", en: "Other" },
];
export const source = (id: string | null) => SOURCES.find((s) => s.id === id)?.en ?? "—";

export const BUSINESS_TYPES = [
  "Shop", "Clinic / hospital", "Medical shop", "School / tuition", "Gym / fitness", "Restaurant / hotel",
  "Transport", "Vehicle service", "Interior / builder", "Textile / saree shop", "Salon / beauty", "Other",
];

export const INTERESTS = ["Business website", "Starter website", "Online shop", "Custom software", "Website maintenance", "Digital marketing", "Mobile app", "Google Business Profile"];

export const WEBSITE_STATUS = [
  { id: "none", en: "No website" },
  { id: "social", en: "Only Instagram / Facebook" },
  { id: "old", en: "Has an old / poor website" },
  { id: "good", en: "Has a good website" },
];

export const ACTIVITY_TYPES = [
  { id: "call", en: "Call", ta: "அழைப்பு", icon: "📞" },
  { id: "whatsapp", en: "WhatsApp", ta: "வாட்ஸ்அப்", icon: "💬" },
  { id: "meeting", en: "Meeting", ta: "சந்திப்பு", icon: "🤝" },
  { id: "visit", en: "Visit", ta: "நேரில்", icon: "🚶" },
  { id: "note", en: "Note", ta: "குறிப்பு", icon: "📝" },
];
export const activityType = (id: string) => ACTIVITY_TYPES.find((a) => a.id === id) ?? { id, en: id, ta: "", icon: "•" };

export const RENEWAL_ITEMS = ["Domain", "Hosting", "Care plan", "SSL certificate", "Google Workspace", "Software support", "Other"];
export const PAYMENT_MODES = ["UPI", "Cash", "Bank transfer", "Cheque", "Card"];
