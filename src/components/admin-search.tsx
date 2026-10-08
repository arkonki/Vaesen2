import Link from "next/link";
export default function AdminSearch({ query, count }: { query?: string; count: number }) {
  return <form className="ledger-search-toolbar" method="get"><label>Search by name<input name="q" type="search" defaultValue={query || ""} placeholder="Find an entry..." /></label><button className="ledger-button" type="submit">Search</button>{query && <Link className="ledger-button" href="?">Clear</Link>}<p role="status" className="text-sm">{count} {count === 1 ? "entry" : "entries"}</p></form>;
}
