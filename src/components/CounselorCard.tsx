import Link from "next/link";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";

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
    <Card padding="lg" className="flex flex-col items-center text-center">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={name}
          className="mb-4 h-20 w-20 rounded-full object-cover ring-2 ring-sage-light"
        />
      ) : (
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-sage-light text-2xl font-medium text-sage-dark">
          {initial}
        </div>
      )}
      <h3 className="font-serif text-xl text-ink">{name}</h3>
      <div className="mt-2">
        <Badge tone="sage">{department}</Badge>
      </div>

      {bio && <p className="mt-3 text-sm text-ink-muted">{bio}</p>}

      <div className="mt-auto w-full pt-6">
        {nextAvailable && (
          <p className="mb-3 text-xs text-ink-subtle">
            Next available: {nextAvailable}
          </p>
        )}
        <Link href={`/student/book?counselorId=${id}`} className="block">
          <Button fullWidth>Book Session</Button>
        </Link>
      </div>
    </Card>
  );
}
