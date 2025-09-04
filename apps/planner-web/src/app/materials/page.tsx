import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MaterialsContent from './MaterialsContent'

export default async function MaterialsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // 프로필 정보 가져오기
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // 학습 자료 목록 가져오기
  const { data: materials } = await supabase
    .from('learning_materials')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  return (
    <MaterialsContent 
      user={user}
      profile={profile}
      materials={materials || []}
    />
  )
}