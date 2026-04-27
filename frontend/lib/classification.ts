export type Category = "FCC" | "CSS" | "UNCLASSIFIED";

export type CategoryResult = {
  category: Category;
  category_note: "strict-override" | "col-based" | "keyword-based" | "split" | "manual-review";
};

const STRICT_FCC_KEYWORDS = [
  "ifmx",
  "fraud",
  "cimb bank berhad",
  "cimb bank berhard",
  "garuda",
  "virtual account",
  "va bni",
  "va bri",
  "va mandiri",
  "va bca",
];

const STRICT_CSS_KEYWORDS = [
  "pentest",
  "penetration",
  "vapt",
  "vulnerability",
  "phishing",
  "powertech",
  "data loss prevention",
  "dlp",
  "forcepoint",
  "fazpass",
  "ciphertrust",
];

const FCC_KEYWORDS = [
  "aml",
  "anti-money laundering",
  "actimize",
  "gro",
  "wlf",
  "sam9",
  "sam 9",
  "goaml",
  "go-aml",
  "fds",
  "corporate fraud",
  "watchlist",
  "screening",
  "barista",
  "gowap",
  "onesumx",
  "antasena",
  "cr-one",
  "crone",
  "iclips",
  "ats database",
  "ats cr",
  "ats maintenance",
  "loyalty system",
  "bcas loyalty",
  "sungl",
  "egls",
  "pocketbank",
  "digicash",
  "lkpbu",
  "jboss bri",
  "los",
  "loan origination",
  "lto",
  "mufg",
  "btpn",
  "cr paynet",
  "cr tcj",
  "cr mcca",
  "cr book",
  "cr resizing",
  "cr update",
  "cr travel",
  "cr enhancement gro",
  "cr adjustment",
  "enhancement gro",
  "cr supply chain",
  "cr murabahah",
  "cr treatment",
  "cr gl",
  "cr split unhold",
  "cr iga",
  "cr enhancement etl",
  "cr digital operational excellence",
  "cr penambahan originating",
  "lcr nsfr",
  "frtb",
  "treasury alm",
  "treasury dan alm",
  "risk modelling",
  "qnb rwa",
  "lld",
  "dhe",
  "middleware retail treasury",
  "tis",
  "bulk disbursement",
  "dcash",
  "dwallet",
  "d wallet",
  "gl engine",
  "restruktur",
  "swift mx",
  "swift release mx",
  "retail banking local maintenance support",
  "corporate banking local maintenance support",
  "onsite support jsl",
  "renewal ams iclips",
  "ams iclips",
  "maintenance jboss",
  "post implementation project",
  "jasa local support lcr",
  "enhancement swift release mx",
  "correspondent banking",
  "cimb berhad fa",
  "cimb berhad",
  "book of octo",
  "renewal ifmx",
];

const CSS_KEYWORDS = [
  "security assessment",
  "pentest",
  "penetration",
  "vapt",
  "vulnerability",
  "bulk mandays pentest",
  "bulkmandays pentest",
  "annual penetration",
  "email phishing",
  "audit dan pentest",
  "third party assesment",
  "third party assessment",
  "vendor assessment",
  "pluxee",
  "soc",
  "siem",
  "managed service soc",
  "managed services soc",
  "soar",
  "threat intel",
  "managed service cybersecurity",
  "renewal support project it",
  "audit it",
  "audit governance",
  "audit surveillance",
  "audit",
  "proxy",
  "iso 27001",
  "iso27001",
  "resertifikasi",
  "sertifikasi iso",
  "certif",
  "tata kelola keamanan siber",
  "pam",
  "cyberark",
  "krontech",
  "iam",
  "identity access",
  "privilege identity",
  "falaina",
  "certificate lifecycle",
  "krmc",
  "kanguru",
  "bigfix",
  "nessus",
  "fortify",
  "sast",
  "sca",
  "dast",
  "tenable",
  "burp",
  "acunetix",
  "titus",
  "trellix",
  "axonius",
  "solarwind",
  "sangfor",
  "imperva",
  "waf",
  "cwaf",
  "firewall",
  "dspm",
  "dynatrace",
  "hcl bigfix",
  "hcl",
  "microfocus fortify",
  "license nessus",
  "server",
  "san switch",
  "huawei storage",
  "microsoft server",
  "managed service m365",
  "patch management",
  "hardening",
  "mobile security",
  "itam",
  "it asset",
  "security awareness",
  "training security",
  "project license",
  "renewal bigfix",
  "renewal microfocus",
  "renewal license hcl",
  "renewal license nessus",
  "renewal license tenable",
  "renewal license burp",
  "license sast",
  "bigfix compliance",
  "license & support",
  "renewal license",
  "renewal proxy",
  "renewal siem",
  "upgrade siem",
  "blackberry workspace",
  "blackberry workspaces",
  "blackberry",
  "bussan auto finance",
  "va",
  "va bulk",
  "project manager bau",
  "privileged access management",
];

function normalizeText(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s\u00a0]+/g, " ")
    .trim();
}

function parseNumeric(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function readFirst(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
  }
  return null;
}

function readNumeric(row: Record<string, unknown>, keys: string[]): number | null {
  return parseNumeric(readFirst(row, keys));
}

function hasKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => {
    if (keyword === "va") {
      return /\bva\b/.test(text);
    }
    return text.includes(keyword);
  });
}

export function determineCategory(row: Record<string, unknown>): CategoryResult {
  const existingCategory = String(readFirst(row, ["category", "CATEGORY", "project_category"]) || "");
  const name = normalizeText(readFirst(row, ["PROJECT_NAME", "PROSPECT_NAME", "project_name", "prospect_name"]));

  // 1. Strict Overrides (Highest priority)
  if (hasKeyword(name, STRICT_FCC_KEYWORDS)) {
    return { category: "FCC", category_note: "strict-override" };
  }

  if (hasKeyword(name, STRICT_CSS_KEYWORDS)) {
    return { category: "CSS", category_note: "strict-override" };
  }

  // 2. Trust already classified data from DB if it's not UNCLASSIFIED
  if (existingCategory === "FCC" || existingCategory === "CSS") {
    return { 
      category: existingCategory as Category, 
      category_note: (row["category_note"] as string | null) || "col-based" 
    };
  }

  const sales3sw = readNumeric(row, ["SALES_3SW", "sales_3sw"]);
  const osvOsl = readNumeric(row, ["OSV - OSL", "SALES_OSV_OSL", "sales_osv_osl"]);
  const osvNonOsl = readNumeric(row, [
    "SALES_OSV_NonOSL",
    "SALES_OSV_NONOSL",
    "OSV - Non OSL",
    "sales_osv_nonosl",
    "osv_non_osl",
  ]);

  if ((sales3sw ?? 0) > 0 && osvNonOsl === null) {
    return { category: "CSS", category_note: "col-based" };
  }

  if ((osvOsl ?? 0) > 0 && osvNonOsl === 0) {
    return { category: "FCC", category_note: "col-based" };
  }

  const hasFcc = hasKeyword(name, FCC_KEYWORDS);
  const hasCss = hasKeyword(name, CSS_KEYWORDS);

  if (hasFcc && hasCss) {
    return { category: "UNCLASSIFIED", category_note: "split" };
  }

  if (hasFcc) return { category: "FCC", category_note: "keyword-based" };
  if (hasCss) return { category: "CSS", category_note: "keyword-based" };

  return { category: "UNCLASSIFIED", category_note: "manual-review" };
}
