const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rhcsduixmhyzmiufunhj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoY3NkdWl4bWh5em1pdWZ1bmhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQwMTE1OCwiZXhwIjoyMDkxOTc3MTU4fQ.qDnGHYtwbxueb3hAMp_0m8MtGplnDOLQi-3o6AxDvgk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("--- Batch Metadata ---");
  const { data: meta, error: metaErr } = await supabase.from('batch_metadata').select('*');
  if (metaErr) console.error(metaErr);
  else console.table(meta);

  console.log("\n--- Prospects Batches ---");
  const { data: pBatches, error: pErr } = await supabase.from('prospects').select('batch_number').order('batch_number', { ascending: false });
  if (pErr) console.error(pErr);
  else {
    const counts = pBatches.reduce((acc, curr) => {
      acc[curr.batch_number] = (acc[curr.batch_number] || 0) + 1;
      return acc;
    }, {});
    console.table(counts);
  }

  console.log("\n--- Backlog Batches ---");
  const { data: bBatches, error: bErr } = await supabase.from('project_targets').select('batch_number').order('batch_number', { ascending: false });
  if (bErr) console.error(bErr);
  else {
    const counts = bBatches.reduce((acc, curr) => {
      acc[curr.batch_number] = (acc[curr.batch_number] || 0) + 1;
      return acc;
    }, {});
    console.table(counts);
  }

  console.log("\n--- Prospects AM Check ---");
  const { data: amNames, error: amErr } = await supabase.from('prospects').select('am_name').limit(100);
  if (amErr) console.error(amErr);
  else {
    const uniqueAMs = Array.from(new Set(amNames.map(a => a.am_name)));
    console.log("Unique AMs in Prospects:", uniqueAMs);
  }
}

check();
