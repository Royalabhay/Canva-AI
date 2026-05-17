import { PricingClient } from "./PricingClient";

export default async function PricingPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const workspaceIdParam = params?.workspaceId;
  const workspaceId = Array.isArray(workspaceIdParam) ? workspaceIdParam[0] : workspaceIdParam;
  return <PricingClient initialWorkspaceId={workspaceId ?? ""} />;
}
