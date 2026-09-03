const WORD_BOUNDARY_KEYWORDS = ["cdd", "pam", "sam", "siem", "va", "wlf", "etl"];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s\u00a0]+/g, " ")
    .trim();
}

function hasKeyword(text, keywords) {
  return keywords.some((keyword) => {
    if (WORD_BOUNDARY_KEYWORDS.includes(keyword)) {
      return new RegExp(`\\b${keyword}\\b`).test(text);
    }
    return text.includes(keyword);
  });
}

const strictFccKeywords = ["ifmx", "fraud", "cimb bank berhad", "cimb bank berhard", "garuda", "virtual account", "va bni", "va bri", "va mandiri", "va bca"];
const strictCssKeywords = ["pentest", "penetration", "vapt", "vulnerability", "phishing", "powertech", "data loss prevention", "dlp", "forcepoint", "fazpass", "ciphertrust", "identity government"];

const name1 = normalizeText("Pentest QRIS CPM");
const name2 = normalizeText("Pentest Audit Virtual Account");

console.log("name1:", name1);
console.log("name1 has strictFcc:", hasKeyword(name1, strictFccKeywords));
console.log("name1 has strictCss:", hasKeyword(name1, strictCssKeywords));

console.log("name2:", name2);
console.log("name2 has strictFcc:", hasKeyword(name2, strictFccKeywords));
console.log("name2 has strictCss:", hasKeyword(name2, strictCssKeywords));
