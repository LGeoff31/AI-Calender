import { useEffect, useState } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { format, parseISO } from "date-fns";
import Head from "next/head";

interface GEvent {
  id?: string;
  iCalUID?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
}

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
  const [events, setEvents] = useState<GEvent[]>([]);
  const [summary, setSummary] = useState<string | null>(null);

  const now = new Date();
  const [month, setMonth] = useState<number>(now.getMonth()); // 0-11
  const [year, setYear] = useState<number>(now.getFullYear());
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const fetchData = async (m: number, y: number) => {
    try {
      const res = await fetch(`/api/summary?month=${m}&year=${y}`);
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
  };

  useEffect(() => {
    setStatus("loading");
    fetchData(month + 1, year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const handleConnect = async () => {
    const res = await fetch("/api/auth/url");
    const { url } = await res.json();
    window.location.href = url;
  };

  return (
    <>
      <Head>
        <title>Calendar Overview</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <div
        className={`${geistSans.className} ${geistMono.className} font-sans flex flex-col items-center justify-center min-h-screen w-full p-8 gap-10 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black`}
      >
        <h1 className="text-4xl font-bold mb-6">Calendar Overview</h1>
        {status === "loading" && <p className="text-lg">Loading…</p>}

        {status === "unauth" && (
          <button
            className="rounded-lg px-5 py-3 bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition"
            onClick={handleConnect}
          >
            Connect Google Calendar
          </button>
        )}

        {status !== "unauth" && (
          <div className="w-full max-w-2xl flex flex-wrap items-end justify-center gap-4 mb-8">
            <div className="flex flex-col">
              <label htmlFor="month" className="text-sm font-medium mb-1">
                Month
              </label>
              <select
                id="month"
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                className="border rounded px-3 py-2 bg-white dark:bg-gray-800"
              >
                {[
                  "Jan",
                  "Feb",
                  "Mar",
                  "Apr",
                  "May",
                  "Jun",
                  "Jul",
                  "Aug",
                  "Sep",
                  "Oct",
                  "Nov",
                  "Dec",
                ].map((name, idx) => (
                  <option key={idx} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label htmlFor="year" className="text-sm font-medium mb-1">
                Year
              </label>
              <select
                id="year"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                className="border rounded px-3 py-2 bg-white dark:bg-gray-800"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {status === "ready" && (
          <div className="w-full max-w-2xl space-y-8">
            <div className="rounded-lg bg-white/70 dark:bg-gray-800/50 shadow p-6 backdrop-blur">
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
            <div className="rounded-lg bg-white/70 dark:bg-gray-800/50 shadow p-6 backdrop-blur">
              <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
              {events.length === 0 ? (
                <p className="text-sm text-gray-500">No events found.</p>
              ) : (
                <ul className="space-y-4">
                  {events.map((event) => (
                    <li
                      key={event.id ?? event.iCalUID ?? Math.random()}
                      className="border rounded-md p-4 bg-gray-50 dark:bg-gray-900 shadow-sm hover:shadow transition"
                    >
                      <h3 className="text-lg font-medium">
                        {event.summary || "(no title)"}
                      </h3>
                      {event.start && event.end && (
                        <p className="text-sm text-gray-500">
                          {(() => {
                            const startRaw =
                              event.start?.dateTime || event.start?.date;
                            const endRaw =
                              event.end?.dateTime || event.end?.date;
                            if (!startRaw || !endRaw) return null;
                            return `${format(
                              parseISO(startRaw),
                              "PP p"
                            )} – ${format(parseISO(endRaw), "PP p")}`;
                          })()}
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
    </>
  );
}
