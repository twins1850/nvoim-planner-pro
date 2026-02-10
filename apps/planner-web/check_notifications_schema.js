const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

async function checkSchema() {
  console.log('=== Checking Notifications Table Schema ===\n');

  // Try to get one notification to see its structure
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .limit(1);

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log('Table columns found:');
    Object.keys(data[0]).forEach(key => {
      console.log(`  - ${key}: ${typeof data[0][key]}`);
    });
  } else {
    console.log('Table is empty, cannot determine columns from data');
  }

  // Try to insert a minimal test
  console.log('\nTrying minimal insert test...');
  const { data: insertData, error: insertError } = await supabase
    .from('notifications')
    .insert({
      user_id: 'ea03a8c4-1390-47df-83e2-79ac1712c6a3',
      type: 'system',
      title: 'Test',
      message: 'Test message'
    })
    .select();

  if (insertError) {
    console.log('Insert error:', insertError.message);
  } else {
    console.log('Insert successful!');
    console.log('Created notification columns:');
    Object.keys(insertData[0]).forEach(key => {
      console.log(`  - ${key}`);
    });
  }
}

checkSchema().catch(console.error);
