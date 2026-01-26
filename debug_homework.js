// Supabase에서 homework 데이터를 직접 확인하는 디버그 스크립트
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hfpgjndyhrcixytbczpj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcGdqbmR5aHJjaXh5dGJjenBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY2NzQ2MjUsImV4cCI6MjA1MjI1MDYyNX0.kdVQUDGo4h4vMcAr7ezsQ7qVKB5pHGzzMnhXXHtUqMk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugHomework() {
  console.log('=== 1. homework 테이블 확인 ===');
  const { data: homeworkData, error: homeworkError } = await supabase
    .from('homework')
    .select('*')
    .limit(5);

  if (homeworkError) {
    console.error('❌ homework 조회 오류:', homeworkError);
  } else {
    console.log('✅ homework 데이터:');
    homeworkData.forEach((hw, idx) => {
      console.log(`\n[${idx + 1}] ID: ${hw.id}`);
      console.log(`   제목: ${hw.title}`);
      console.log(`   설명: ${hw.description?.substring(0, 50)}...`);
      console.log(`   마감일: ${hw.due_date}`);
    });
  }

  console.log('\n=== 2. homework_assignments 테이블 확인 ===');
  const { data: assignmentData, error: assignmentError } = await supabase
    .from('homework_assignments')
    .select('*')
    .limit(10);

  if (assignmentError) {
    console.error('❌ homework_assignments 조회 오류:', assignmentError);
  } else {
    console.log('✅ homework_assignments 데이터:');
    assignmentData.forEach((assignment, idx) => {
      console.log(`\n[${idx + 1}] Assignment ID: ${assignment.id}`);
      console.log(`   Homework ID: ${assignment.homework_id}`);
      console.log(`   Student ID: ${assignment.student_id}`);
      console.log(`   Status: ${assignment.status}`);
    });
  }

  console.log('\n=== 3. 조인 쿼리 테스트 (student_id: 16498636-f755-49e4-987f-82668edf714e) ===');
  const { data: joinedData, error: joinedError } = await supabase
    .from('homework_assignments')
    .select(`
      *,
      homework (
        id,
        title,
        description,
        due_date
      )
    `)
    .eq('student_id', '16498636-f755-49e4-987f-82668edf714e');

  if (joinedError) {
    console.error('❌ 조인 쿼리 오류:', joinedError);
  } else {
    console.log('✅ 조인 쿼리 결과:');
    joinedData.forEach((item, idx) => {
      console.log(`\n[${idx + 1}] Assignment ID: ${item.id}`);
      console.log(`   Homework Object:`, item.homework);
      console.log(`   Homework Title:`, item.homework?.title);
    });
  }
}

debugHomework().catch(console.error);
