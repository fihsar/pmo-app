require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.from('business_rules').select('*').eq('id', 1).single();
  if (error) console.error(error);
  else console.log(JSON.stringify(data.keyword_rules, null, 2));
}

check();
