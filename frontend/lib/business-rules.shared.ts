export type KeywordRules = {
  strictFccKeywords: string[];
  strictCssKeywords: string[];
  fccKeywords: string[];
  cssKeywords: string[];
};

export type BusinessRules = {
  targetGrossProfit: number;
  allowedAccountManagers: string[];
  kpiProjectManagers: string[];
  keywordRules: KeywordRules;
};

const DEFAULT_STRICT_FCC_KEYWORDS = [
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

const DEFAULT_STRICT_CSS_KEYWORDS = [
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

const DEFAULT_FCC_KEYWORDS = [
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

const DEFAULT_CSS_KEYWORDS = [
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

export const defaultBusinessRules: BusinessRules = {
  targetGrossProfit: 36_000_000_000,
  allowedAccountManagers: [],
  kpiProjectManagers: [],
  keywordRules: {
    strictFccKeywords: [],
    strictCssKeywords: [],
    fccKeywords: [],
    cssKeywords: [],
  },
};

function uniqueNormalizedStrings(values: unknown, lowercase = false): string[] {
  if (!Array.isArray(values)) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const normalized = lowercase ? trimmed.toLowerCase() : trimmed;
    const dedupeKey = normalized.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    result.push(normalized);
  }

  return result;
}

export function normalizeBusinessRules(input: Partial<BusinessRules> | null | undefined): BusinessRules {
  const allowedAccountManagers = uniqueNormalizedStrings(input?.allowedAccountManagers);
  const kpiProjectManagers = uniqueNormalizedStrings(input?.kpiProjectManagers, true);
  const strictFccKeywords = uniqueNormalizedStrings(input?.keywordRules?.strictFccKeywords, true);
  const strictCssKeywords = uniqueNormalizedStrings(input?.keywordRules?.strictCssKeywords, true);
  const fccKeywords = uniqueNormalizedStrings(input?.keywordRules?.fccKeywords, true);
  const cssKeywords = uniqueNormalizedStrings(input?.keywordRules?.cssKeywords, true);

  return {
    targetGrossProfit:
      typeof input?.targetGrossProfit === "number" && Number.isFinite(input.targetGrossProfit)
        ? input.targetGrossProfit
        : defaultBusinessRules.targetGrossProfit,
    allowedAccountManagers,
    kpiProjectManagers,
    keywordRules: {
      strictFccKeywords,
      strictCssKeywords,
      fccKeywords,
      cssKeywords,
    },
  };
}

export function splitMultilineInput(value: string, lowercase = false): string[] {
  return uniqueNormalizedStrings(value.split("\n"), lowercase);
}
