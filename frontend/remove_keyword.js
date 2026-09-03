require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function removeKeyword() {
  const { data, error } = await supabase.from('business_rules').select('*').eq('id', 1).single();
  if (error) {
    console.error('Error fetching rules:', error);
    return;
  }

  const rules = data.rules;
  const keywordRules = rules.keywordRules;
  
  if (keywordRules && keywordRules.strictFccKeywords) {
    const originalCount = keywordRules.strictFccKeywords.length;
    keywordRules.strictFccKeywords = keywordRules.strictFccKeywords.filter(
      k => k.toLowerCase() !== "virtual account"
    );
    
    if (keywordRules.strictFccKeywords.length < originalCount) {
      console.log('Removed "virtual account". Updating DB...');
      const { error: updateError } = await supabase
        .from('business_rules')
        .update({ rules: rules })
        .eq('id', 1);
        
      if (updateError) {
        console.error('Failed to update:', updateError);
      } else {
        console.log('Database updated successfully!');
      }
    } else {
      console.log('"virtual account" not found in DB rules.');
    }
  }
}

removeKeyword();
