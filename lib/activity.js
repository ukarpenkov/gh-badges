const USER = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
const TTL_OK = 4 * 60 * 60 * 1000;
const TTL_MISS = 10 * 60 * 1000;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sept", "oct", "nov", "dec"];
const cache = new Map();

export function validUser(login) {
  return USER.test(login);
}

export function currentMonth(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const today = now.getUTCDate();
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const days = [];
  for (let day = 1; day <= today; day += 1) {
    days.push(`${prefix}-${String(day).padStart(2, "0")}`);
  }
  return { month: MONTHS[month], from: days[0], today: days[days.length - 1], days };
}

export async function loadActivity(login) {
  const clock = currentMonth();
  const key = `${login.toLowerCase()}:${clock.today}`;
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) {
    if (hit.error) throw hit.error;
    return hit.activity;
  }

  try {
    const activity = await fetchActivity(login, clock);
    cache.set(key, { until: Date.now() + TTL_OK, activity });
    return activity;
  } catch (error) {
    if (error.code === "NOT_FOUND") {
      cache.set(key, { until: Date.now() + TTL_MISS, error });
    }
    throw error;
  }
}

async function fetchActivity(login, clock) {
  const token = process.env.GITHUB_TOKEN;
  let byDate;
  if (token) {
    try {
      byDate = await fromGraphql(login, token, clock);
    } catch (error) {
      if (error.code === "NOT_FOUND") throw error;
    }
  }
  if (!byDate) byDate = await fromCalendar(login);
  return pack(login, byDate, clock);
}

async function fromGraphql(login, token, clock) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "gh-badges",
    },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      query: `query($login:String!, $from:DateTime!, $to:DateTime!){
        user(login:$login){
          contributionsCollection(from:$from, to:$to) {
            contributionCalendar {
              weeks { contributionDays { date contributionCount } }
            }
          }
        }
      }`,
      variables: {
        login,
        from: `${clock.from}T00:00:00Z`,
        to: `${clock.today}T23:59:59Z`,
      },
    }),
  });
  if (!response.ok) throw new Error(`GitHub GraphQL ${response.status}`);
  const payload = await response.json();
  if (!payload.data?.user) {
    const error = new Error("GitHub user not found");
    error.code = "NOT_FOUND";
    throw error;
  }
  const byDate = new Map();
  for (const week of payload.data.user.contributionsCollection.contributionCalendar.weeks) {
    for (const day of week.contributionDays) {
      byDate.set(day.date, day.contributionCount);
    }
  }
  return byDate;
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
  for (const match of html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})" id="(contribution-day-component-\d+-\d+)"/g)) {
    dates.set(match[2], match[1]);
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
  const byDate = new Map();
  for (const [id, date] of dates) {
    byDate.set(date, (byDate.get(date) || 0) + (counts.get(id) || 0));
  }
  return byDate;
}

function pack(login, byDate, clock) {
  const days = clock.days.map((date) => ({ date, count: byDate.get(date) || 0 }));
  const total = days.reduce((sum, day) => sum + day.count, 0);
  return { login, days, total, month: clock.month, from: clock.from };
}
