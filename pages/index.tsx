import { useEffect, useState } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { format, parseISO } from "date-fns";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  const [status, setStatus] = useState<"loading" | "unauth" | "ready">(
    "loading"
  );
  const [events, setEvents] = useState<any[]>([]);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/summary");
        if (res.status === 200) {
          const data = await res.json();
          setEvents(data.events);
          setSummary(data.summary);
          setStatus("ready");
        } else {
          setStatus("unauth");
        }
      } catch {
        setStatus("unauth");
      }
    })();
  }, []);

  const handleConnect = async () => {
    const res = await fetch("/api/auth/url");
    const { url } = await res.json();
    window.location.href = url;
  };

  return (
    <div
      className={`${geistSans.className} ${geistMono.className} font-sans flex flex-col items-center justify-center min-h-screen p-8 gap-6`}
    >
      {status === "loading" && <p className="text-lg">Loading…</p>}

      {status === "unauth" && (
        <button
          className="rounded-lg px-5 py-3 bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition"
          onClick={handleConnect}
        >
          Connect Google Calendar
        </button>
      )}

      {status === "ready" && (
        <div className="w-full max-w-2xl space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Summary</h2>
            {summary && (
              <div
                className="prose dark:prose-invert text-sm"
                dangerouslySetInnerHTML={{
                  __html: summary.replace(/\n/g, "<br />"),
                }}
              />
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
            {events.length === 0 ? (
              <p className="text-sm text-gray-500">No events found.</p>
            ) : (
              <ul className="space-y-4">
                {events.map((event) => (
                  <li
                    key={event.id ?? event.iCalUID ?? Math.random()}
                    className="border rounded-md p-4 bg-gray-50 dark:bg-gray-900"
                  >
                    <h3 className="text-lg font-medium">
                      {event.summary || "(no title)"}
                    </h3>
                    {event.start && (
                      <p className="text-sm text-gray-500">
                        {format(
                          parseISO(event.start.dateTime || event.start.date),
                          "PP p"
                        )}
                        {" – "}
                        {format(
                          parseISO(event.end.dateTime || event.end.date),
                          "PP p"
                        )}
                      </p>
                    )}
                    {event.location && (
                      <p className="text-sm">{event.location}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
