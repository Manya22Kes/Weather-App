const API_KEY = "0389375ac6910775196acd3f99c41c9a";
const BASE = "https://api.openweathermap.org/data/2.5";

let unit = "metric";
let lastCity = "";
let lastCoords = null;
let isUsingLocation = false;

const weatherFacts = [
  "💧 Did you know? The atmosphere holds 37.5 million cubic kilometers of water.",
  "☁️ Clouds travel at speeds between 20-40 mph at an elevation of 6,500 feet.",
  "⚡ Lightning is 5 times hotter than the surface of the sun.",
  "❄️ No two snowflakes are exactly alike in structure.",
  "🌪️ Tornadoes can reach speeds of over 200 mph.",
  "🌈 Rainbows are actually full circles, but we only see half from the ground.",
  "💨 Wind speed increases with altitude.",
  "☀️ The sun provides 99.86% of Earth's energy.",
];

let currentFactIndex = 0;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("api-note").classList.add("hidden");
  show("welcome-section");
  showNextFact();
  setInterval(showNextFact, 8000);
});

window.addEventListener("offline", () => {
  showError("⚠ You are offline. Check your internet connection.");
});

window.addEventListener("online", () => {
  hide("error");
});

function showNextFact() {
  const factEl = document.getElementById("weather-fact");
  factEl.style.opacity = "0";
  factEl.style.transition = "opacity 0.5s ease";

  setTimeout(() => {
    factEl.textContent = weatherFacts[currentFactIndex];
    currentFactIndex = (currentFactIndex + 1) % weatherFacts.length;
    factEl.style.opacity = "1";
  }, 250);
}

function searchCity(city) {
  document.getElementById("cityInput").value = city;
  fetchWeather();
}

const weatherIcons = {
  "01d": "☀️",
  "01n": "🌙",
  "02d": "⛅",
  "02n": "🌥️",
  "03d": "☁️",
  "03n": "☁️",
  "04d": "☁️",
  "04n": "☁️",
  "09d": "🌧️",
  "09n": "🌧️",
  "10d": "🌦️",
  "10n": "🌧️",
  "11d": "⛈️",
  "11n": "⛈️",
  "13d": "❄️",
  "13n": "❄️",
  "50d": "🌫️",
  "50n": "🌫️",
};

const bgMap = (icon) => {
  if (!icon) return "var(--sky-day)";
  const id = icon.slice(0, 2);
  if (id === "01" || id === "02")
    return icon.endsWith("n") ? "var(--sky-night)" : "var(--sky-day)";
  if (id === "03" || id === "04" || id === "50") return "var(--sky-cloudy)";
  if (id === "09" || id === "10" || id === "11") return "var(--sky-storm)";
  if (id === "13")
    return "linear-gradient(160deg, #b0c4de 0%, #cfe2f3 60%, #e8f4fd 100%)";
  return "var(--sky-day)";
};

function setUnit(u) {
  unit = u;

  document.getElementById("btn-c").className = u === "metric" ? "active" : "";
  document.getElementById("btn-f").className = u === "imperial" ? "active" : "";

  const isWeatherVisible = !document
    .getElementById("main-card")
    .classList.contains("hidden");
  if (!isWeatherVisible) return;

  if (isUsingLocation && lastCoords) {
    useMyLocation();
  } else if (lastCity) {
    fetchWeather();
  }
}

function show(id) {
  document.getElementById(id).classList.remove("hidden");
}
function hide(id) {
  document.getElementById(id).classList.add("hidden");
}

function clearSearch() {
  document.getElementById("cityInput").value = "";
  document.getElementById("error").textContent = "";

  hide("error");
  hide("main-card");
  hide("forecast-card");
  hide("loading");
  hide("api-note");

  show("welcome-section");

  lastCity = "";
  lastCoords = null;
  isUsingLocation = false;

  document.body.style.background = "var(--sky-day)";
}

function showError(msg) {
  const el = document.getElementById("error");
  el.textContent = msg;
  show("error");
}

function fmtTime(unix, offset) {
  const d = new Date((unix + offset) * 1000);
  return d.toUTCString().slice(17, 22);
}

function fmtDay(unix) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[new Date(unix * 1000).getDay()];
}

function useMyLocation() {
  if (!navigator.onLine) {
    showError("⚠ No internet connection");
    return;
  }

  if (!navigator.geolocation) {
    showError("Geolocation is not supported by your browser");
    return;
  }

  hide("error");
  hide("main-card");
  hide("forecast-card");
  hide("welcome-section");
  show("loading");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      try {
        const [wRes, fRes] = await Promise.all([
          fetch(
            `${BASE}/weather?lat=${lat}&lon=${lon}&units=${unit}&appid=${API_KEY}`,
          ),
          fetch(
            `${BASE}/forecast?lat=${lat}&lon=${lon}&units=${unit}&cnt=40&appid=${API_KEY}`,
          ),
        ]);

        if (!wRes.ok) {
          if (wRes.status === 401) {
            throw new Error("Invalid API key.");
          } else {
            throw new Error("Unable to fetch weather for your location.");
          }
        }

        const w = await wRes.json();
        const f = await fRes.json();

        lastCoords = { lat, lon };
        isUsingLocation = true;
        lastCity = w.name;

        renderCurrent(w);
        renderForecast(f, w.timezone);

        hide("loading");
        show("main-card");
        show("forecast-card");

        document.body.style.background = bgMap(w.weather[0].icon);
      } catch (e) {
        hide("loading");
        showError("⚠ " + e.message);
      }
    },

    (error) => {
      hide("loading");

      if (error.code === 1) {
        showError("⚠ Location permission denied");
      } else if (error.code === 2) {
        showError("⚠ Location unavailable");
      } else if (error.code === 3) {
        showError("⚠ Location request timed out");
      } else {
        showError("⚠ Unable to fetch location");
      }
    },

    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    },
  );
}

async function fetchWeather() {
  if (!navigator.onLine) {
    showError("⚠ No internet connection");
    return;
  }

  const city = document.getElementById("cityInput").value.trim();
  if (!city) return;

  isUsingLocation = false;
  lastCity = city;

  hide("error");
  hide("main-card");
  hide("forecast-card");
  hide("welcome-section");
  hide("api-note");
  show("loading");

  try {
    const [wRes, fRes] = await Promise.all([
      fetch(
        `${BASE}/weather?q=${encodeURIComponent(city)}&units=${unit}&appid=${API_KEY}`,
      ),
      fetch(
        `${BASE}/forecast?q=${encodeURIComponent(city)}&units=${unit}&cnt=40&appid=${API_KEY}`,
      ),
    ]);

    if (!wRes.ok) {
      const err = await wRes.json();

      if (wRes.status === 404) {
        throw new Error("City not found. Try a valid location.");
      } else if (wRes.status === 401) {
        throw new Error("Invalid API key.");
      } else {
        throw new Error(err.message || "Something went wrong");
      }
    }

    const w = await wRes.json();
    const f = await fRes.json();

    renderCurrent(w);
    renderForecast(f, w.timezone);

    hide("loading");
    show("main-card");
    show("forecast-card");

    document.body.style.background = bgMap(w.weather[0].icon);
  } catch (e) {
    hide("loading");
    showError("⚠ " + e.message);
  }
}

function renderCurrent(w) {
  const deg = unit === "metric" ? "°C" : "°F";
  const spd = unit === "metric" ? "km/h" : "mph";
  const windSpd =
    unit === "metric"
      ? Math.round(w.wind.speed * 3.6)
      : Math.round(w.wind.speed);

  const cityEl = document.getElementById("cityDisplay");

  if (isUsingLocation) {
    cityEl.innerHTML = `
      <div class="location-label">📍 Using your current location</div>
      <div>${w.name}, ${w.sys.country}</div>
    `;
  } else {
    cityEl.textContent = `${w.name}, ${w.sys.country}`;
  }

  document.getElementById("dateDisplay").textContent =
    new Date().toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  document.getElementById("tempDisplay").textContent =
    Math.round(w.main.temp) + deg;
  document.getElementById("feelsDisplay").textContent =
    `Feels like ${Math.round(w.main.feels_like)}${deg}`;
  document.getElementById("iconDisplay").textContent =
    weatherIcons[w.weather[0].icon] || "🌡️";
  document.getElementById("conditionDisplay").textContent =
    w.weather[0].description;
  document.getElementById("humidityDisplay").textContent =
    w.main.humidity + "%";
  document.getElementById("windDisplay").textContent = windSpd + " " + spd;
  document.getElementById("visDisplay").textContent = w.visibility
    ? (w.visibility / 1000).toFixed(1) + " km"
    : "N/A";
  document.getElementById("uvDisplay").textContent = "N/A";
  document.getElementById("pressDisplay").textContent =
    w.main.pressure + " hPa";
  document.getElementById("sunriseDisplay").textContent = fmtTime(
    w.sys.sunrise,
    w.timezone,
  );
}

function renderForecast(f) {
  const deg = unit === "metric" ? "°C" : "°F";
  const daily = {};

  f.list.forEach((item) => {
    const day = fmtDay(item.dt);
    if (!daily[day]) {
      daily[day] = {
        hi: -Infinity,
        lo: Infinity,
        icon: item.weather[0].icon,
        desc: item.weather[0].description,
      };
    }
    daily[day].hi = Math.max(daily[day].hi, item.main.temp_max);
    daily[day].lo = Math.min(daily[day].lo, item.main.temp_min);
  });

  const days = Object.entries(daily).slice(0, 5);
  const list = document.getElementById("forecastList");

  list.innerHTML = days
    .map(
      ([day, d]) => `
    <div class="forecast-row">
      <span class="forecast-day">${day}</span>
      <span class="forecast-icon">${weatherIcons[d.icon] || "🌡️"}</span>
      <span class="forecast-desc">${d.desc}</span>
      <span class="forecast-temps">
        <span class="hi">${Math.round(d.hi)}${deg}</span>
        <span class="lo">${Math.round(d.lo)}${deg}</span>
      </span>
    </div>
  `,
    )
    .join("");
}

document.getElementById("cityInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") fetchWeather();
});
