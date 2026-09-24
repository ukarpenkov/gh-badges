const USER = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
const TTL_OK = 4 * 60 * 60 * 1000;
const TTL_MISS = 10 * 60 * 1000;
const cache = new Map();

export function validUser(login) {
  return USER.test(login);
}

export async function loadActivity(login) {
  const key = login.toLowerCase();
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) {
    if (hit.error) throw hit.error;
    return hit.activity;
  }

  try {
    const activity = await fetchActivity(login);
    const ttl = typeof activity.commits === "number" ? TTL_OK : TTL_MISS;
    cache.set(key, { until: Date.now() + ttl, activity });
    return activity;
  } catch (error) {
    if (error.code === "NOT_FOUND") {
      cache.set(key, { until: Date.now() + TTL_MISS, error });
    }
    throw error;
  }
}

async function fetchActivity(login) {
  const token = process.env.GITHUB_TOKEN;
  let weeks;
  if (token) {
    try {
      weeks = await fromGraphql(login, token);
    } catch (error) {
      if (error.code === "NOT_FOUND") throw error;
    }
  }
  if (!weeks) weeks = await fromCalendar(login);
  const activity = pack(login, weeks);
  activity.commits = await commitCount(login, activity.from, token);
  return activity;
}

async function fromGraphql(login, token) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "gh-badges",
    },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      query: `query($login:String!){
        user(login:$login){
          contributionsCollection {
            contributionCalendar {
              weeks { contributionDays { date contributionCount } }
            }
          }
        }
      }`,
      variables: { login },
    }),
  });
  if (!response.ok) throw new Error(`GitHub GraphQL ${response.status}`);
  const payload = await response.json();
  if (!payload.data?.user) {
    const error = new Error("GitHub user not found");
    error.code = "NOT_FOUND";
    throw error;
  }
  const weeks = payload.data.user.contributionsCollection.contributionCalendar.weeks.map((week) => {
    const days = week.contributionDays;
    return {
      start: days[0].date,
      count: days.reduce((sum, day) => sum + day.contributionCount, 0),
    };
  });
  return weeks.slice(-13);
}

async function fromCalendar(login) {
  const response = await fetch(`https://github.com/users/${login}/contributions`, {
    headers: {
      "User-Agent": "gh-badges",
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 404) {
    const error = new Error("GitHub user not found");
    error.code = "NOT_FOUND";
    throw error;
  }
  if (!response.ok) throw new Error(`GitHub contributions ${response.status}`);
  const html = await response.text();
  const dates = new Map();
  for (const match of html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})" id="(contribution-day-component-\d+-(\d+))"/g)) {
    dates.set(match[2], { date: match[1], week: Number(match[3]) });
  }
  if (dates.size < 7) {
    const error = new Error("GitHub user not found");
    error.code = "NOT_FOUND";
    throw error;
  }
  const counts = new Map();
  for (const match of html.matchAll(/for="(contribution-day-component-\d+-\d+)"[^>]*>([^<]*)</g)) {
    const text = match[2].trim();
    counts.set(match[1], text.startsWith("No ") ? 0 : Number.parseInt(text, 10) || 0);
  }
  const byWeek = new Map();
  for (const [id, cell] of dates) {
    const bucket = byWeek.get(cell.week) || { start: cell.date, count: 0 };
    bucket.count += counts.get(id) || 0;
    if (cell.date < bucket.start) bucket.start = cell.date;
    byWeek.set(cell.week, bucket);
  }
  const weeks = [...byWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, week]) => week);
  return weeks.slice(-13);
}

async function commitCount(login, from, token) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) return null;
  const query = `author:${login} author-date:>=${from}`;
  const headers = {
    "User-Agent": "gh-badges",
    Accept: "application/vnd.github+json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const response = await fetch(`https://api.github.com/search/commits?per_page=1&q=${encodeURIComponent(query)}`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error("commit search", response.status, (await response.text()).slice(0, 180));
      return null;
    }
    const payload = await response.json();
    if (payload.incomplete_results || typeof payload.total_count !== "number") {
      console.error("commit search incomplete", payload.incomplete_results, payload.total_count);
      return null;
    }
    return payload.total_count;
  } catch {
    return null;
  }
}

function pack(login, weeks) {
  const rows = weeks.slice(-13);
  while (rows.length < 13) rows.unshift({ start: rows[0]?.start || "", count: 0 });
  const total = rows.reduce((sum, week) => sum + week.count, 0);
  const from = rows.find((week) => week.start)?.start || "";
  return { login, weeks: rows, total, from, commits: null };
}
