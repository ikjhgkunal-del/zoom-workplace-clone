import { redirect } from 'next/navigation';

export default async function MeetingIndexPage({ searchParams }) {
  const sp = await searchParams;
  const id = sp?.meetingId || sp?.id;
  if (id) {
    redirect(`/meeting/${encodeURIComponent(id)}`);
  }
  redirect('/meetings');
}
