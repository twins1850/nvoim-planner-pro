const SUPABASE_URL = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8';
const USER_ID = '5a94931e-aeb2-44ec-88c8-db35b9b46642';
const NEW_PASSWORD = 'kjrkzo1002#';

fetch(`${SUPABASE_URL}/auth/v1/admin/users/${USER_ID}`, {
  method: 'PUT',
  headers: {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    password: NEW_PASSWORD
  })
})
  .then(response => response.json())
  .then(data => {
    console.log('Password update result:', data);
    if (data.id) {
      console.log('✅ Password successfully updated for:', data.email);
    } else if (data.error) {
      console.log('❌ Error:', data.error);
    }
  })
  .catch(error => {
    console.error('❌ Request failed:', error);
  });
