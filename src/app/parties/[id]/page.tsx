import { redirect } from "next/navigation";

export default function PartyPage({ params }: { params: { id: string } }) {
  redirect(`/parties/${params.id}/management`);
}
