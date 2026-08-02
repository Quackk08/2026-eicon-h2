import { supabase } from "../supabase/client.js";
import type { Place } from "@renew/shared";

interface PlaceRow {
  id: string;
  name: string;
  category: string;
  address_region: string | null;
  distance_bucket: "near" | "medium" | "far" | null;
  hours: string | null;
  cost_level: number | null;
  crowd_level: string | null;
  social_level: string | null;
  accessibility: string | null;
  is_partner: boolean;
  verified_at: string | null;
  notes: string | null;
}

function toDomain(row: PlaceRow): Place {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    addressRegion: row.address_region,
    distanceBucket: row.distance_bucket,
    hours: row.hours,
    costLevel: row.cost_level,
    crowdLevel: row.crowd_level,
    socialLevel: row.social_level,
    accessibility: row.accessibility,
    isPartner: row.is_partner,
    verifiedAt: row.verified_at,
    notes: row.notes
  };
}

export async function listPlacesByCategories(categories: string[]): Promise<Place[]> {
  const { data, error } = await supabase.from("places").select().in("category", categories);
  if (error) throw error;
  return (data as PlaceRow[]).map(toDomain);
}

export async function listAllPlaces(): Promise<Place[]> {
  const { data, error } = await supabase.from("places").select();
  if (error) throw error;
  return (data as PlaceRow[]).map(toDomain);
}

export async function getPlaceById(id: string): Promise<Place | null> {
  const { data, error } = await supabase.from("places").select().eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toDomain(data as PlaceRow) : null;
}

export async function upsertPlaces(places: Array<Omit<Place, "isPartner"> & { isPartner?: boolean }>): Promise<void> {
  const rows = places.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    address_region: p.addressRegion,
    distance_bucket: p.distanceBucket,
    hours: p.hours,
    cost_level: p.costLevel,
    crowd_level: p.crowdLevel,
    social_level: p.socialLevel,
    accessibility: p.accessibility,
    is_partner: p.isPartner ?? false,
    verified_at: p.verifiedAt,
    notes: p.notes
  }));
  const { error } = await supabase.from("places").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}
