import { loadCastleView } from "@/lib/castle-data";
import HQDashboard from "./hq-dashboard";
export default async function HQPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HQDashboard key={id} view={await loadCastleView(id)} />;
}
