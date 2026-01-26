const SUPABASE_URL = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8';

fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.twins0581@naver.com`, {
  method: 'GET',
  headers: {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  }
})
  .then(response => response.json())
  .then(data => {
    console.log('Profile query result:');
    console.log(JSON.stringify(data, null, 2));

    if (data && data.length > 0) {
      const profile = data[0];
      console.log('\n✅ Admin profile found:');
      console.log('   ID:', profile.id);
      console.log('   Email:', profile.email);
      console.log('   Role:', profile.role);
      console.log('   Full Name:', profile.full_name);
      console.log('   Active:', profile.is_active);
    } else {
      console.log('\n❌ No profile found for twins0581@naver.com');
    }
  })
  .catch(error => {
    console.error('❌ Request failed:', error);
  });
