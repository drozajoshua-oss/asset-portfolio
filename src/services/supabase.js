import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://wbfkihpwwwraeatbisiw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiZmtpaHB3d3dyYWVhdGJpc2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MTIyNTIsImV4cCI6MjA5ODI4ODI1Mn0.85Yeuxsasj1Zwpuj2kkU5mtwgltfFd5-GAUWrtQ8UE0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
