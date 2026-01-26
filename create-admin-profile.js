const SUPABASE_URL = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8';

fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
  method: 'POST',
  headers: {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
  },
  body: JSON.stringify({
    id: 'b71e6d13-4122-459c-8509-44c7979d0a7b',
    role: 'admin',
    full_name: 'Admin User',
    email: 'twins0581@naver.com',
    is_active: true
  })
})
  .then(async response => {
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    console.log('Response body:', text);

    if (response.status === 201 || response.status === 200) {
      console.log('✅ Admin profile successfully created!');
      if (text) {
        try {
          const data = JSON.parse(text);
          console.log('   Email:', data.email || 'twins0581@naver.com');
          console.log('   ID:', data.id || 'b71e6d13-4122-459c-8509-44c7979d0a7b');
          console.log('   Role:', data.role || 'admin');
        } catch (e) {
          console.log('   (Response was empty or not JSON)');
        }
      }
    } else {
      console.log('❌ Error creating profile');
      if (text) {
        try {
          const data = JSON.parse(text);
          console.log('Error details:', data);
        } catch (e) {
          console.log('Error text:', text);
        }
      }
    }
  })
  .catch(error => {
    console.error('❌ Request failed:', error);
  });
