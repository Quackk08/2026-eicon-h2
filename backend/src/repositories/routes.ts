import { supabase } from "../supabase/client.js";

export interface RouteStepRow {
  id: string;
  route_id: string;
  sequence: number;
  template_id: string;
  ladder_level: number;
  status: "pending" | "current" | "done" | "skipped";
  created_at: string;
}

export interface RouteRow {
  id: string;
  vision_id: string;
  status: "active" | "paused";
  version: number;
  created_at: string;
  updated_at: string;
}

export interface RouteWithSteps extends RouteRow {
  steps: RouteStepRow[];
}

export async function createRoute(
  visionId: string,
  steps: Array<{ templateId: string; ladderLevel: number }>
): Promise<RouteWithSteps> {
  const { data: route, error: routeError } = await supabase
    .from("life_routes")
    .insert({ vision_id: visionId })
    .select()
    .single();
  if (routeError) throw routeError;

  const stepRows = steps.map((step, index) => ({
    route_id: route.id,
    sequence: index,
    template_id: step.templateId,
    ladder_level: step.ladderLevel,
    status: index === 0 ? "current" : "pending"
  }));

  const { data: insertedSteps, error: stepsError } = await supabase
    .from("route_steps")
    .insert(stepRows)
    .select()
    .order("sequence", { ascending: true });
  if (stepsError) throw stepsError;

  return { ...route, steps: insertedSteps };
}

export async function getRouteById(id: string): Promise<RouteWithSteps | null> {
  const { data: route, error: routeError } = await supabase.from("life_routes").select().eq("id", id).maybeSingle();
  if (routeError) throw routeError;
  if (!route) return null;

  const { data: steps, error: stepsError } = await supabase
    .from("route_steps")
    .select()
    .eq("route_id", id)
    .order("sequence", { ascending: true });
  if (stepsError) throw stepsError;

  return { ...route, steps };
}

export async function getLatestRouteForVision(visionId: string): Promise<RouteWithSteps | null> {
  const { data: route, error } = await supabase
    .from("life_routes")
    .select()
    .eq("vision_id", visionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!route) return null;
  return getRouteById(route.id);
}

export async function updateRouteStatus(id: string, status: "active" | "paused"): Promise<RouteRow> {
  const { data, error } = await supabase
    .from("life_routes")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateStepStatus(
  stepId: string,
  status: RouteStepRow["status"]
): Promise<RouteStepRow> {
  const { data, error } = await supabase
    .from("route_steps")
    .update({ status })
    .eq("id", stepId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Marks one Route step done and promotes the next pending step to current. */
export async function completeRouteStep(stepId: string): Promise<void> {
  const { data: step, error: stepError } = await supabase
    .from("route_steps")
    .select()
    .eq("id", stepId)
    .maybeSingle();
  if (stepError) throw stepError;
  if (!step) return;

  await updateStepStatus(step.id, "done");

  const { data: next, error: nextError } = await supabase
    .from("route_steps")
    .select()
    .eq("route_id", step.route_id)
    .gt("sequence", step.sequence)
    .in("status", ["pending", "current"])
    .order("sequence", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (nextError) throw nextError;
  if (next) await updateStepStatus(next.id, "current");
}

export async function getRouteStepById(stepId: string): Promise<RouteStepRow | null> {
  const { data, error } = await supabase
    .from("route_steps")
    .select()
    .eq("id", stepId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function addRouteStep(
  routeId: string,
  templateId: string,
  sequence: number,
  ladderLevel: number
): Promise<RouteStepRow> {
  const { data, error } = await supabase
    .from("route_steps")
    .insert({
      route_id: routeId,
      template_id: templateId,
      sequence,
      ladder_level: ladderLevel,
      status: "pending"
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function replaceRouteStepTemplate(
  stepId: string,
  templateId: string,
  ladderLevel: number
): Promise<RouteStepRow> {
  const { data, error } = await supabase
    .from("route_steps")
    .update({ template_id: templateId, ladder_level: ladderLevel })
    .eq("id", stepId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function reorderRouteSteps(routeId: string, stepIds: string[]): Promise<void> {
  const route = await getRouteById(routeId);
  if (!route) throw new Error("route not found");
  const existing = new Set(route.steps.map((step) => step.id));
  if (stepIds.length !== existing.size || stepIds.some((id) => !existing.has(id))) {
    throw new Error("stepIds must contain every route step exactly once");
  }

  await Promise.all(
    stepIds.map(async (id, sequence) => {
      const { error } = await supabase
        .from("route_steps")
        .update({ sequence, ladder_level: sequence + 1 })
        .eq("id", id)
        .eq("route_id", routeId);
      if (error) throw error;
    })
  );
}

export async function deleteRouteStep(routeId: string, stepId: string): Promise<void> {
  const { error } = await supabase
    .from("route_steps")
    .delete()
    .eq("id", stepId)
    .eq("route_id", routeId);
  if (error) throw error;

  const route = await getRouteById(routeId);
  if (route) await reorderRouteSteps(routeId, route.steps.map((step) => step.id));
}
