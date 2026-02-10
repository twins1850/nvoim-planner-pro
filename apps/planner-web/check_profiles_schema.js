const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

async function checkSchema() {
  console.log('=== Checking Table Schemas ===\n');

  // Check profiles table
  console.log('1. Profiles table:');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (profiles && profiles.length > 0) {
    console.log('   Columns:', Object.keys(profiles[0]).join(', '));
  }

  // Check student_profiles table
  console.log('\n2. Student_profiles table:');
  const { data: studentProfiles } = await supabase
    .from('student_profiles')
    .select('*')
    .limit(1);

  if (studentProfiles && studentProfiles.length > 0) {
    console.log('   Columns:', Object.keys(studentProfiles[0]).join(', '));
  }
}

checkSchema().catch(console.error);
