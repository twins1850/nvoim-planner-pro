// Fix homework RLS policy directly via Supabase client
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hfpgjndyhrcixytbczpj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcGdqbmR5aHJjaXh5dGJjenBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjY3NDYyNSwiZXhwIjoyMDUyMjUwNjI1fQ.2KpDXy9zdHtJumw4FHgIhHfSqF8ghDZvF_7EsaOCZZA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRLSPolicy() {
  console.log('🔧 Fixing homework RLS policy...\n');

  // Drop the incorrect policy
  console.log('1️⃣ Dropping incorrect policy...');
  const { error: dropError } = await supabase.rpc('exec_sql', {
    sql: 'DROP POLICY IF EXISTS "Students can view assigned homework" ON public.homework;'
  });

  if (dropError) {
    console.error('❌ Error dropping policy:', dropError);
    return;
  }
  console.log('✅ Policy dropped\n');

  // Create the correct policy
  console.log('2️⃣ Creating correct policy...');
  const { error: createError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE POLICY "Students can view assigned homework"
        ON public.homework FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.students
            WHERE students.id = homework.student_id
            AND students.user_id = auth.uid()
          )
        );
    `
  });

  if (createError) {
    console.error('❌ Error creating policy:', createError);
    return;
  }
  console.log('✅ Policy created successfully!\n');

  // Verify the fix by testing the query
  console.log('3️⃣ Testing the fix...');
  const { data, error } = await supabase
    .from('homework_assignments')
    .select(`
      *,
      homework (
        id,
        title,
        description
      )
    `)
    .limit(1);

  if (error) {
    console.error('❌ Test query error:', error);
  } else {
    console.log('✅ Test query result:');
    console.log(JSON.stringify(data, null, 2));
  }
}

fixRLSPolicy().catch(console.error);
