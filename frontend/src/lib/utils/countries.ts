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
  // North America
  US: "United States", CA: "Canada", MX: "Mexico", PR: "Puerto Rico",
  KY: "Cayman Islands", BS: "Bahamas", JM: "Jamaica", CU: "Cuba", HT: "Haiti",
  DO: "Dominican Republic", PA: "Panama", CR: "Costa Rica", GT: "Guatemala",
  HN: "Honduras", NI: "Nicaragua", SV: "El Salvador", BZ: "Belize",
  TT: "Trinidad and Tobago", BB: "Barbados",
  // South America
  BR: "Brazil", AR: "Argentina", CL: "Chile", PE: "Peru", CO: "Colombia",
  VE: "Venezuela", EC: "Ecuador", BO: "Bolivia", PY: "Paraguay", UY: "Uruguay",
  GY: "Guyana", SR: "Suriname",
  // Europe
  GB: "United Kingdom", DE: "Germany", FR: "France", ES: "Spain", IT: "Italy",
  PT: "Portugal", NL: "Netherlands", BE: "Belgium", CH: "Switzerland",
  AT: "Austria", SE: "Sweden", FI: "Finland", NO: "Norway", DK: "Denmark",
  IE: "Ireland", PL: "Poland", CZ: "Czechia", GR: "Greece", RO: "Romania",
  HU: "Hungary", BG: "Bulgaria", RS: "Serbia", HR: "Croatia", SK: "Slovakia",
  SI: "Slovenia", EE: "Estonia", LT: "Lithuania", LV: "Latvia", IS: "Iceland",
  LU: "Luxembourg", MT: "Malta", CY: "Cyprus", AL: "Albania", MK: "Macedonia",
  ME: "Montenegro", BA: "Bosnia and Herzegovina", XK: "Kosovo",
  // Eastern Europe / CIS
  RU: "Russia", UA: "Ukraine", BY: "Belarus", MD: "Moldova", GE: "Georgia",
  AM: "Armenia", AZ: "Azerbaijan", KZ: "Kazakhstan", UZ: "Uzbekistan",
  KG: "Kyrgyzstan", TJ: "Tajikistan", TM: "Turkmenistan",
  // Middle East
  TR: "Turkey", IL: "Israel", IR: "Iran", IQ: "Iraq", SY: "Syria",
  LB: "Lebanon", JO: "Jordan", PS: "Palestine", SA: "Saudi Arabia",
  AE: "United Arab Emirates", QA: "Qatar", KW: "Kuwait", OM: "Oman",
  BH: "Bahrain", YE: "Yemen", AF: "Afghanistan",
  // Africa
  EG: "Egypt", MA: "Morocco", DZ: "Algeria", TN: "Tunisia", LY: "Libya",
  SD: "Sudan", SS: "South Sudan", NG: "Nigeria", ZA: "South Africa",
  KE: "Kenya", ET: "Ethiopia", GH: "Ghana", CI: "Ivory Coast",
  SN: "Senegal", CM: "Cameroon", UG: "Uganda", TZ: "Tanzania", AO: "Angola",
  MZ: "Mozambique", MG: "Madagascar", ZW: "Zimbabwe", ZM: "Zambia",
  RW: "Rwanda", BW: "Botswana", NA: "Namibia", ML: "Mali", SO: "Somalia",
  // Asia
  CN: "China", HK: "Hong Kong", TW: "Taiwan", JP: "Japan", KR: "South Korea",
  KP: "North Korea", IN: "India", PK: "Pakistan", BD: "Bangladesh",
  SG: "Singapore", MY: "Malaysia", TH: "Thailand", ID: "Indonesia",
  PH: "Philippines", VN: "Vietnam", MN: "Mongolia", LK: "Sri Lanka",
  NP: "Nepal", BT: "Bhutan", MM: "Myanmar", KH: "Cambodia", LA: "Laos",
  MO: "Macau", BN: "Brunei",
  // Oceania
  AU: "Australia", NZ: "New Zealand", FJ: "Fiji", PG: "Papua New Guinea",
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

// ECharts world map (johan/world.geo.json) uses these exact `name` properties.
// Where they differ from human-friendly names we override here.
// Reference: https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json
const COUNTRY_NAMES_ECHARTS: Record<string, string> = {
  ...COUNTRY_NAMES_EN,
  US: "United States of America",
  GB: "United Kingdom",
  RU: "Russia",
  KR: "South Korea",
  KP: "North Korea",
  AE: "United Arab Emirates",
  CZ: "Czech Republic",
  CD: "Democratic Republic of the Congo",
  CG: "Republic of the Congo",
  CI: "Ivory Coast",
  TZ: "United Republic of Tanzania",
  TL: "East Timor",
  RS: "Republic of Serbia",
  BA: "Bosnia and Herzegovina",
  MK: "Macedonia",
  SY: "Syria",
  GW: "Guinea Bissau",
  GQ: "Equatorial Guinea",
  CF: "Central African Republic",
  SS: "South Sudan",
  SR: "Suriname",
  BS: "The Bahamas",
  TT: "Trinidad and Tobago",
  GM: "Gambia",
  // Hong Kong / Taiwan / Greenland sometimes don't render — they are a separate
  // polygon in the dataset. ECharts will silently drop unknown names.
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
