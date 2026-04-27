/**
 * Backfill Classification Script
 * This script iterates through all rows in projects, prospects, and project_targets
 * and applies the current classification logic to populate the new 'category' columns.
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../frontend/.env.local') });

// Import the classification logic
// Note: In a real environment, we'd use the compiled version or a shared lib.
// Here I'll use a simplified version of the logic we just unified.
const STRICT_FCC_KEYWORDS = ["ifmx", "fraud", "cimb bank berhad", "cimb bank berhard", "garuda", "virtual account", "va bni", "va bri", "va mandiri", "va bca"];
const STRICT_CSS_KEYWORDS = ["hcl", "bussan auto finance", "project manager bau", "privileged access management", "third party assesment", "audit", "fazpass", "ciphertrust"];
const FCC_KEYWORDS = ["fcc", "aml", "anti money laundering", "kyc", "know your customer", "wlf", "trade finance", "tf", "fatca", "crs", "financial crime", "compliance", "fraud", "murex", "kondor", "fccm", "mantas", "gowap", "ifmx", "garuda", "cimb berhad", "book of octo"];
const CSS_KEYWORDS = ["css", "security", "cyber", "soc", "siem", "va", "vulnerability", "pt", "pentest", "penetration", "isams", "grc", "dlp", "data loss prevention", "forcepoint", "proxy", "pam", "privileged access", "identity", "iam", "cybersecurity", "fortify", "microfocus"];

function hasKeyword(text, keywords) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return keywords.some(k => lowerText.includes(k.toLowerCase()));
}

function determineCategory(row) {
    const name = (row.project_name || row.prospect_name || "").toLowerCase();
    
    if (hasKeyword(name, STRICT_FCC_KEYWORDS)) return { category: "FCC", note: "backfill-strict-fcc" };
    if (hasKeyword(name, STRICT_CSS_KEYWORDS)) return { category: "CSS", note: "backfill-strict-css" };
    if (hasKeyword(name, FCC_KEYWORDS)) return { category: "FCC", note: "backfill-keyword-fcc" };
    if (hasKeyword(name, CSS_KEYWORDS)) return { category: "CSS", note: "backfill-keyword-css" };
    
    return { category: "UNCLASSIFIED", note: "backfill-unclassified" };
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function backfillTable(tableName) {
    console.log(`Starting backfill for ${tableName}...`);
    
    // Fetch all rows where category is null
    const { data: rows, error } = await supabase
        .from(tableName)
        .select('*')
        .is('category', null);
        
    if (error) {
        console.error(`Error fetching ${tableName}:`, error.message);
        return;
    }
    
    console.log(`Found ${rows.length} rows to update in ${tableName}.`);
    
    for (const row of rows) {
        const { category, note } = determineCategory(row);
        const { error: updateError } = await supabase
            .from(tableName)
            .update({ category, category_note: note })
            .eq('id', row.id);
            
        if (updateError) {
            console.error(`Error updating row ${row.id} in ${tableName}:`, updateError.message);
        }
    }
    
    console.log(`Finished backfill for ${tableName}.`);
}

async function run() {
    await backfillTable('projects');
    await backfillTable('prospects');
    await backfillTable('project_targets');
    console.log('All backfills completed.');
}

run();
