const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

async function checkNotifications() {
  console.log('=== Checking notifications table ===\n');

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .limit(5);

  if (error) {
    console.log('❌ Error:', error.message);
    console.log('\nNotifications table may not exist or has issues.');
  } else {
    console.log('✅ Notifications table exists!');
    console.log('Sample data:', data);
  }
}

checkNotifications();
