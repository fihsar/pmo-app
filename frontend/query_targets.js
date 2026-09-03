require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('project_targets')
    .select('project_name, project_category, category, category_note, batch_number')
    .ilike('project_name', '%QRIS%')
    .order('batch_number', { ascending: false })
    .limit(5);
  
  if (error) console.error(error);
  else console.log(data);
}

check();
