// Shared country utilities so flag/name/echarts mapping is identical
// everywhere (mentions table, geo map, source cards, dropdowns).

const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸", GB: "🇬🇧", UK: "🇬🇧", DE: "🇩🇪", FR: "🇫🇷", ES: "🇪🇸",
  IT: "🇮🇹", PT: "🇵🇹", NL: "🇳🇱", BE: "🇧🇪", CH: "🇨🇭", AT: "🇦🇹",
  SE: "🇸🇪", FI: "🇫🇮", NO: "🇳🇴", DK: "🇩🇰", IE: "🇮🇪", PL: "🇵🇱",
  CZ: "🇨🇿", GR: "🇬🇷", RO: "🇷🇴", HU: "🇭🇺", BG: "🇧🇬", RS: "🇷🇸",
  HR: "🇭🇷", SK: "🇸🇰", SI: "🇸🇮", EE: "🇪🇪", LT: "🇱🇹", LV: "🇱🇻",
  IS: "🇮🇸", RU: "🇷🇺", KZ: "🇰🇿", UA: "🇺🇦", BY: "🇧🇾", UZ: "🇺🇿",
  KG: "🇰🇬", TJ: "🇹🇯", AZ: "🇦🇿", AM: "🇦🇲", GE: "🇬🇪", MD: "🇲🇩",
  TR: "🇹🇷", IL: "🇮🇱", IR: "🇮🇷", IQ: "🇮🇶", SA: "🇸🇦", AE: "🇦🇪",
  QA: "🇶🇦", KW: "🇰🇼", OM: "🇴🇲", BH: "🇧🇭", JO: "🇯🇴", LB: "🇱🇧",
  EG: "🇪🇬", MA: "🇲🇦", DZ: "🇩🇿", TN: "🇹🇳", LY: "🇱🇾",
  NG: "🇳🇬", ZA: "🇿🇦", KE: "🇰🇪", ET: "🇪🇹", GH: "🇬🇭",
  CN: "🇨🇳", HK: "🇭🇰", TW: "🇹🇼", JP: "🇯🇵", KR: "🇰🇷", KP: "🇰🇵",
  IN: "🇮🇳", PK: "🇵🇰", BD: "🇧🇩", SG: "🇸🇬", MY: "🇲🇾", TH: "🇹🇭",
  ID: "🇮🇩", PH: "🇵🇭", VN: "🇻🇳", MN: "🇲🇳",
  CA: "🇨🇦", MX: "🇲🇽", BR: "🇧🇷", AR: "🇦🇷", CL: "🇨🇱", PE: "🇵🇪",
  CO: "🇨🇴", VE: "🇻🇪", EC: "🇪🇨",
  AU: "🇦🇺", NZ: "🇳🇿",
};

const COUNTRY_NAMES_EN: Record<string, string> = {
  US: "United States", GB: "United Kingdom", DE: "Germany", FR: "France",
  ES: "Spain", IT: "Italy", PT: "Portugal", NL: "Netherlands", BE: "Belgium",
  CH: "Switzerland", AT: "Austria", SE: "Sweden", FI: "Finland", NO: "Norway",
  DK: "Denmark", IE: "Ireland", PL: "Poland", CZ: "Czechia", GR: "Greece",
  RO: "Romania", HU: "Hungary", BG: "Bulgaria", RS: "Serbia", HR: "Croatia",
  SK: "Slovakia", SI: "Slovenia", EE: "Estonia", LT: "Lithuania", LV: "Latvia",
  IS: "Iceland", RU: "Russia", KZ: "Kazakhstan", UA: "Ukraine", BY: "Belarus",
  UZ: "Uzbekistan", KG: "Kyrgyzstan", TJ: "Tajikistan", AZ: "Azerbaijan",
  AM: "Armenia", GE: "Georgia", MD: "Moldova",
  TR: "Turkey", IL: "Israel", IR: "Iran", IQ: "Iraq",
  SA: "Saudi Arabia", AE: "United Arab Emirates", QA: "Qatar", KW: "Kuwait",
  OM: "Oman", BH: "Bahrain", JO: "Jordan", LB: "Lebanon",
  EG: "Egypt", MA: "Morocco", DZ: "Algeria", TN: "Tunisia", LY: "Libya",
  NG: "Nigeria", ZA: "South Africa", KE: "Kenya", ET: "Ethiopia", GH: "Ghana",
  CN: "China", HK: "Hong Kong", TW: "Taiwan", JP: "Japan",
  KR: "South Korea", KP: "North Korea", IN: "India", PK: "Pakistan",
  BD: "Bangladesh", SG: "Singapore", MY: "Malaysia", TH: "Thailand",
  ID: "Indonesia", PH: "Philippines", VN: "Vietnam", MN: "Mongolia",
  CA: "Canada", MX: "Mexico", BR: "Brazil", AR: "Argentina", CL: "Chile",
  PE: "Peru", CO: "Colombia", VE: "Venezuela", EC: "Ecuador",
  AU: "Australia", NZ: "New Zealand",
};

const COUNTRY_NAMES_RU: Record<string, string> = {
  US: "США", GB: "Великобритания", DE: "Германия", FR: "Франция",
  ES: "Испания", IT: "Италия", PT: "Португалия", NL: "Нидерланды",
  BE: "Бельгия", CH: "Швейцария", AT: "Австрия", SE: "Швеция",
  FI: "Финляндия", NO: "Норвегия", DK: "Дания", IE: "Ирландия",
  PL: "Польша", CZ: "Чехия", GR: "Греция", RU: "Россия", KZ: "Казахстан",
  UA: "Украина", BY: "Беларусь", UZ: "Узбекистан", KG: "Кыргызстан",
  TJ: "Таджикистан", AZ: "Азербайджан", AM: "Армения", GE: "Грузия",
  MD: "Молдова", TR: "Турция", IL: "Израиль", IR: "Иран",
  SA: "Саудовская Аравия", AE: "ОАЭ", QA: "Катар", EG: "Египет",
  CN: "Китай", JP: "Япония", KR: "Южная Корея", IN: "Индия",
  CA: "Канада", BR: "Бразилия", AR: "Аргентина",
  AU: "Австралия", NZ: "Новая Зеландия",
};

const COUNTRY_NAMES_KZ: Record<string, string> = {
  US: "АҚШ", GB: "Ұлыбритания", DE: "Германия", FR: "Франция",
  RU: "Ресей", KZ: "Қазақстан", UA: "Украина", BY: "Беларусь",
  UZ: "Өзбекстан", KG: "Қырғызстан", TJ: "Тәжікстан",
  TR: "Түркия", CN: "Қытай", JP: "Жапония", IN: "Үндістан",
  CA: "Канада", BR: "Бразилия", AU: "Австралия",
};

// ECharts world map uses English names — keep this in sync with the maps.
const COUNTRY_NAMES_ECHARTS: Record<string, string> = {
  ...COUNTRY_NAMES_EN,
  US: "United States",
  GB: "United Kingdom",
  KR: "South Korea",
  KP: "North Korea",
  AE: "United Arab Emirates",
  CZ: "Czech Republic",
};

export function getCountryFlag(code: string | null | undefined): string {
  if (!code) return "🌍";
  const normalized = code.toUpperCase();
  return COUNTRY_FLAGS[normalized] || "🌍";
}

export function getCountryName(
  code: string | null | undefined,
  locale: string = "en"
): string {
  if (!code) return "Unknown";
  const normalized = code.toUpperCase();
  if (normalized === "XX") return "Unknown";
  const lang = (locale || "en").split("-")[0].toLowerCase();
  if (lang === "ru") return COUNTRY_NAMES_RU[normalized] || COUNTRY_NAMES_EN[normalized] || normalized;
  if (lang === "kk" || lang === "kz") return COUNTRY_NAMES_KZ[normalized] || COUNTRY_NAMES_EN[normalized] || normalized;
  return COUNTRY_NAMES_EN[normalized] || normalized;
}

export function getEChartsCountryName(code: string | null | undefined): string {
  if (!code) return "Unknown";
  const normalized = code.toUpperCase();
  return COUNTRY_NAMES_ECHARTS[normalized] || COUNTRY_NAMES_EN[normalized] || normalized;
}

export function isKnownCountry(code: string | null | undefined): boolean {
  if (!code) return false;
  const normalized = code.toUpperCase();
  return normalized !== "XX" && !!COUNTRY_NAMES_EN[normalized];
}
