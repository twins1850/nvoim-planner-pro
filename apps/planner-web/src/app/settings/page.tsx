import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsContent from './SettingsContent.tsx'

export default async function SettingsPage() {
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

  return (
    <SettingsContent 
      user={user}
      profile={profile}
    />
  )
}