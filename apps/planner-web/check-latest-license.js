const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

async function checkLatestLicense() {
  const { data, error } = await supabase
    .from('licenses')
    .select('license_key, duration_days, max_students, status, created_at, planner_id')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Latest 5 licenses:');
  data.forEach((license, index) => {
    console.log(`${index + 1}. ${license.license_key} - ${license.duration_days}일/${license.max_students}명 - ${license.status} - ${new Date(license.created_at).toLocaleString()}`);
  });
}

checkLatestLicense();
