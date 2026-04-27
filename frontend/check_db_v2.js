const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rhcsduixmhyzmiufunhj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoY3NkdWl4bWh5em1pdWZ1bmhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQwMTE1OCwiZXhwIjoyMDkxOTc3MTU4fQ.qDnGHYtwbxueb3hAMp_0m8MtGplnDOLQi-3o6AxDvgk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("--- Row Counts ---");
  const { count: pCount } = await supabase.from('prospects').select('*', { count: 'exact', head: true });
  const { count: tCount } = await supabase.from('project_targets').select('*', { count: 'exact', head: true });
  const { count: prCount } = await supabase.from('projects').select('*', { count: 'exact', head: true });
  console.log("Prospects total rows:", pCount);
  console.log("Targets total rows:", tCount);
  console.log("Projects total rows:", prCount);

  console.log("\n--- Prospects Samples ---");
  const { data: pSample } = await supabase.from('prospects').select('*').limit(5);
  console.log(JSON.stringify(pSample, null, 2));

  console.log("\n--- Batch Metadata ---");
  const { data: meta } = await supabase.from('batch_metadata').select('*');
  console.table(meta);
}

check();
