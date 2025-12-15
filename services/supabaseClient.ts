
import { createClient } from '@supabase/supabase-js';

// REMPLACEZ CES VALEURS PAR CELLES DE VOTRE DASHBOARD SUPABASE
const SUPABASE_URL = 'https://votre-projet.supabase.co';
const SUPABASE_ANON_KEY = 'votre-cle-publique-anon';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Types Helper pour la base de données
export type DbCampaign = {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  frame_url: string;
  hashtags: string[];
  created_at: string;
  views_count: number;
  downloads_count: number;
  shares_count: number;
  text_fields_config: any; // JSONB
  is_private: boolean;
};
