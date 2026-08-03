import { supabase } from "../supabase/client.js";

export interface TrustedContactRow {
  id: string;
  profile_id: string;
  name: string;
  relationship: string | null;
  phone: string | null;
  created_at: string;
}

export interface TrustedContactInput {
  name: string;
  relationship?: string | null;
  phone?: string | null;
}

export async function listTrustedContacts(profileId: string): Promise<TrustedContactRow[]> {
  const { data, error } = await supabase
    .from("trusted_contacts")
    .select()
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as TrustedContactRow[];
}

export async function getTrustedContact(
  profileId: string,
  id: string
): Promise<TrustedContactRow | null> {
  const { data, error } = await supabase
    .from("trusted_contacts")
    .select()
    .eq("profile_id", profileId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as TrustedContactRow) ?? null;
}

export async function createTrustedContact(
  profileId: string,
  input: TrustedContactInput
): Promise<TrustedContactRow> {
  const { data, error } = await supabase
    .from("trusted_contacts")
    .insert({
      profile_id: profileId,
      name: input.name,
      relationship: input.relationship ?? null,
      phone: input.phone ?? null
    })
    .select()
    .single();
  if (error) throw error;
  return data as TrustedContactRow;
}

export async function updateTrustedContact(
  profileId: string,
  id: string,
  input: TrustedContactInput
): Promise<TrustedContactRow | null> {
  const { data, error } = await supabase
    .from("trusted_contacts")
    .update({
      name: input.name,
      relationship: input.relationship ?? null,
      phone: input.phone ?? null
    })
    .eq("profile_id", profileId)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return (data as TrustedContactRow) ?? null;
}

export async function deleteTrustedContact(profileId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from("trusted_contacts")
    .delete()
    .eq("profile_id", profileId)
    .eq("id", id);
  if (error) throw error;
}
