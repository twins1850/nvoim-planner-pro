#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function findTestStudent() {
  console.log('🔍 Searching for "관리자 테스트용 학생"...\n');

  // Get all student profiles
  const { data: students, error } = await supabase
    .from('student_profiles')
    .select('id, full_name, email, phone, planner_id')
    .ilike('full_name', '%관리자%테스트%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Found students:', JSON.stringify(students, null, 2));

  if (students && students.length > 0) {
    const student = students[0];
    console.log('\n✅ Test Student Found:');
    console.log('Name:', student.full_name);
    console.log('ID:', student.id);
    console.log('Email:', student.email);
    console.log('Phone:', student.phone);

    // Get auth user info
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(student.id);

    if (!authError && authUser) {
      console.log('\n🔐 Auth Info:');
      console.log('Email:', authUser.user.email);
      console.log('Created:', authUser.user.created_at);
      console.log('Last sign in:', authUser.user.last_sign_in_at);
    }
  } else {
    console.log('❌ No student found with that name. Showing all students:');

    const { data: allStudents } = await supabase
      .from('student_profiles')
      .select('id, full_name, email');

    console.log(JSON.stringify(allStudents, null, 2));
  }
}

findTestStudent();
