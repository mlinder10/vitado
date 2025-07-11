import Link from "next/link";

export default function AdminHeader() {
  return (
    <header className="flex items-center bg-secondary px-6 border-b-2 h-header">
      <nav className="flex justify-between w-full">
        <Link href="/admin">
          <h1 className="font-bold text-xl">Vitoro - Admin</h1>
        </Link>
        <ul className="flex gap-4">
          <li>
            <Link href="/admin/create" className="text-muted-foreground">
              Create
            </Link>
          </li>
          <li>
            <Link href="/admin/review" className="ml-4 text-muted-foreground">
              Review
            </Link>
          </li>
          <li>
            <Link href="/admin/users" className="ml-4 text-muted-foreground">
              Users
            </Link>
          </li>
          <li>
            <Link href="/" className="ml-4 text-muted-foreground">
              Main Site
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
