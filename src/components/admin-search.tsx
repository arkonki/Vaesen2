import Link from "next/link";
export default function AdminSearch({ query, count, hiddenFields = {} }: { query?: string; count: number; hiddenFields?: Record<string, string> }) {
  return <form className="ledger-search-toolbar" method="get">{Object.entries(hiddenFields).map(([name,value])=><input key={name} type="hidden" name={name} value={value}/>)}<label>Search by name<input name="q" type="search" defaultValue={query || ""} placeholder="Find an entry..." /></label><button className="ledger-button" type="submit">Search</button>{query && <Link className="ledger-button" href={`?${new URLSearchParams(hiddenFields)}`}>Clear</Link>}<p role="status" className="text-sm">{count} {count === 1 ? "entry" : "entries"}</p></form>;
}
