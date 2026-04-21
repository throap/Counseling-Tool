import Link from "next/link";

interface Props {
  id: string;
  name: string;
  department: string;
  bio: string | null;
  photoUrl: string | null;
  nextAvailable?: string | null;
}

export default function CounselorCard({
  id,
  name,
  department,
  bio,
  photoUrl,
  nextAvailable,
}: Props) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-4">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={name}
            className="h-14 w-14 rounded-full object-cover ring-2 ring-brand-100"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-xl font-semibold text-brand-700">
            {initial}
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
          <p className="text-sm text-brand-700">{department}</p>
        </div>
      </div>
      {bio && <p className="text-sm text-slate-600">{bio}</p>}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
        <span className="text-slate-500">
          {nextAvailable ? `Next open: ${nextAvailable}` : "Availability on next page"}
        </span>
        <Link
          href={`/student/book/${id}`}
          className="rounded-md bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-700"
        >
          Book
        </Link>
      </div>
    </div>
  );
}
