import { redirect } from "next/navigation";

export default async function TasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/parties/${id}/goals`);
}
