// Jab aap AWS API Gateway bana lengi, toh uska link yahan quotes ke andar daal dena:
const API_GATEWAY_URL = "";

const CITY_DATA = {
  bengaluru: { city: "Bengaluru", aqi: 42, yesterdayAqi: 48, pm25: 36, pm10: 58, no2: 71, o3: 86 },
  delhi:     { city: "Delhi",     aqi: 168, yesterdayAqi: 192, pm25: 82, pm10: 88, no2: 74, o3: 46 },
  jaipur:    { city: "Jaipur",    aqi: 96,  yesterdayAqi: 110, pm25: 54, pm10: 68, no2: 44, o3: 52 },
  mumbai:    { city: "Mumbai",    aqi: 74,  yesterdayAqi: 84,  pm25: 45, pm10: 62, no2: 48, o3: 40 }
};

let currentCity = CITY_DATA.bengaluru;
let favoriteCities = ["Delhi", "Bengaluru"];
let recentSearches = [
  { city: "Bengaluru", aqi: 42 },
  { city: "Delhi", aqi: 168 }
];

function getPollutantInfo(pct) {
  if (pct <= 50) return { bgClass: "bg-good", label: "Good" };
  if (pct <= 65) return { bgClass: "bg-moderate", label: "Moderate" };
  if (pct <= 80) return { bgClass: "bg-poor", label: "Poor" };
  return { bgClass: "bg-severe", label: "Severe" };
}

function getAqiDetails(aqi) {
  if (aqi <= 50) {
    return {
      category: "Good",
      textClass: "text-good",
      heading: "Good AQI",
      desc: "Air quality is clean & fresh! You can open windows & go outside also.",
      risk: "Low Health risk"
    };
  }
  if (aqi <= 100) {
    return {
      category: "Moderate",
      textClass: "text-moderate",
      heading: "Moderate AQI",
      desc: "Air quality is acceptable. Unusually sensitive people should limit prolonged outdoor exertion.",
      risk: "Moderate Health risk"
    };
  }
  if (aqi <= 200) {
    return {
      category: "Poor",
      textClass: "text-poor",
      heading: "Poor AQI",
      desc: "Stay indoors where possible and keep doors/windows closed. Use an N95 mask if going outside.",
      risk: "High Health risk"
    };
  }
  return {
    category: "Severe",
    textClass: "text-severe",
    heading: "Severe AQI",
    desc: "Avoid outdoor activities completely and keep windows closed. Wear an N95 mask strictly if stepping out.",
    risk: "Severe Health risk"
  };
}

function updateCircle(circleId, pctId, labelId, pctValue) {
  const info = getPollutantInfo(pctValue);
  document.getElementById(circleId).className = "pollutant-circle " + info.bgClass;
  document.getElementById(pctId).textContent = pctValue + "%";
  document.getElementById(labelId).textContent = info.label;
}

function renderDashboard(data) {
  currentCity = data;
  const aqi = Math.round(data.aqi);
  const yesterday = Math.round(data.yesterdayAqi);
  const details = getAqiDetails(aqi);

  document.getElementById("displayCity").textContent = data.city;
  document.getElementById("aqiNumber").textContent = aqi;
  const statusEl = document.getElementById("aqiStatusText");
  statusEl.textContent = details.category;
  statusEl.className = "aqi-category-text " + details.textClass;

  document.getElementById("yesterdayVal").textContent = yesterday;
  document.getElementById("todayVal").textContent = aqi;

  const diff = aqi - yesterday;
  const pctChange = yesterday > 0 ? Math.abs(Math.round((diff / yesterday) * 100)) : 0;
  const badgeEl = document.getElementById("diffBadge");
  const lineEl = document.getElementById("hindiComparisonText");

  if (diff <= 0) {
    badgeEl.textContent = `↓ ${Math.abs(diff)} pts (${pctChange}% better)`;
    badgeEl.className = "diff-badge badge-better";
    lineEl.textContent = `The air is  ${pctChange}% cleaner today`;
  } else {
    badgeEl.textContent = `↑ +${diff} pts (${pctChange}% worse)`;
    badgeEl.className = "diff-badge badge-worse";
    lineEl.textContent = `The air is ${pctChange}% worse today`;
  }

  updateCircle("circlePm25", "pctPm25", "labelPm25", data.pm25);
  updateCircle("circlePm10", "pctPm10", "labelPm10", data.pm10);
  updateCircle("circleNo2",  "pctNo2",  "labelNo2",  data.no2);
  updateCircle("circleO3",   "pctO3",   "labelO3",   data.o3);

  const recHeading = document.getElementById("recHeading");
  recHeading.textContent = details.heading;
  recHeading.className = "rec-status " + details.textClass;
  document.getElementById("recDescription").textContent = details.desc;
  document.getElementById("recRiskLevel").textContent = details.risk;
}

function renderFavorites() {
  const container = document.getElementById("favoriteCitiesContainer");
  container.innerHTML = "";

  favoriteCities.forEach((city) => {
    const pill = document.createElement("div");
    pill.className = "fav-pill";

    const nameBtn = document.createElement("button");
    nameBtn.type = "button";
    nameBtn.className = "fav-pill-name";
    nameBtn.textContent = "★ " + city;
    nameBtn.addEventListener("click", () => {
      document.getElementById("cityInput").value = city;
      checkCityAqi(city);
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "fav-pill-remove";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => {
      favoriteCities = favoriteCities.filter((c) => c.toLowerCase() !== city.toLowerCase());
      renderFavorites();
    });

    pill.appendChild(nameBtn);
    pill.appendChild(removeBtn);
    container.appendChild(pill);
  });
}

function renderRecentSearches() {
  const listEl = document.getElementById("recentSearchesList");
  listEl.innerHTML = "";

  recentSearches.forEach((item) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "recent-row";
    row.innerHTML = `
      <span class="recent-city-name">${item.city}</span>
      <span class="recent-aqi-box">AQI ${item.aqi}</span>
    `;
    row.addEventListener("click", () => {
      document.getElementById("cityInput").value = item.city;
      checkCityAqi(item.city);
    });
    listEl.appendChild(row);
  });
}

async function checkCityAqi(cityName) {
  const query = (cityName || "").trim();
  if (!query) return;

  const key = query.toLowerCase();
  let result = null;

  try {
    if (API_GATEWAY_URL && API_GATEWAY_URL.startsWith("http")) {
      const response = await fetch(`${API_GATEWAY_URL}?city=${encodeURIComponent(query)}`);
      if (response.ok) {
        const cloudData = await response.json();
        const p = cloudData.pollutantPercentages || {};
        result = {
          city: cloudData.city,
          aqi: cloudData.aqi,
          yesterdayAqi: cloudData.yesterdayAqi,
          pm25: p.pm25_pct || 36,
          pm10: p.pm10_pct || 58,
          no2:  p.no2_pct  || 71,
          o3:   p.o3_pct   || 86
        };
      }
    }

     if (!result) {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
      const geoJson = await geoRes.json();
      if (geoJson.results && geoJson.results.length > 0) {
        const loc = geoJson.results[0];
        const aqRes = await fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.latitude}&longitude=${loc.longitude}&current=us_aqi,pm10,pm2_5,nitrogen_dioxide,ozone&hourly=us_aqi&past_days=1&forecast_days=1`
        );
        const aqJson = await aqRes.json();
        const cur = aqJson.current || {};
        const todayAqi = Math.round(cur.us_aqi || 50);
        let yestAqi = todayAqi + 6;
        if (aqJson.hourly && Array.isArray(aqJson.hourly.us_aqi)) {
          const valid = aqJson.hourly.us_aqi.slice(0, 24).filter((n) => typeof n === "number");
          if (valid.length > 0) {
            yestAqi = Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
          }
        }
        result = {
          city: loc.name,
          aqi: todayAqi,
          yesterdayAqi: yestAqi,
          pm25: Math.min(100, Math.max(10, Math.round(((cur.pm2_5 || 18) / 25) * 50))),
          pm10: Math.min(100, Math.max(10, Math.round(((cur.pm10 || 48) / 50) * 50))),
          no2:  Math.min(100, Math.max(10, Math.round(((cur.nitrogen_dioxide || 35) / 40) * 50))),
          o3:   Math.min(100, Math.max(10, Math.round(((cur.ozone || 55) / 50) * 50)))
        };
      }
    }
  } catch (err) {}

  if (!result) {
    result = {
      city: query.charAt(0).toUpperCase() + query.slice(1),
      aqi: 64,
      yesterdayAqi: 72,
      pm25: 44,
      pm10: 60,
      no2: 52,
      o3: 48
    };
  }

  recentSearches = [
    { city: result.city, aqi: result.aqi },
    ...recentSearches.filter((r) => r.city.toLowerCase() !== result.city.toLowerCase())
  ].slice(0, 5);

  renderDashboard(result);
  renderRecentSearches();
}

window.addEventListener("DOMContentLoaded", () => {
  renderDashboard(CITY_DATA.bengaluru);
  renderFavorites();
  renderRecentSearches();
  checkCityAqi("Bengaluru");   //website khulte hi live AQI layega!

  document.getElementById("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    checkCityAqi(document.getElementById("cityInput").value);
  });

  document.getElementById("clearInputBtn").addEventListener("click", () => {
    const input = document.getElementById("cityInput");
    input.value = "";
    input.focus();
  });

  document.getElementById("favToggleBtn").addEventListener("click", () => {
    const city = currentCity.city;
    const exists = favoriteCities.some((c) => c.toLowerCase() === city.toLowerCase());
    if (!exists) {
      favoriteCities.push(city);
      renderFavorites();
    }
  });

  document.getElementById("clearRecentBtn").addEventListener("click", () => {
    recentSearches = [];
    renderRecentSearches();
  });

  document.querySelectorAll(".quick-city-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const city = btn.getAttribute("data-city");
      document.getElementById("cityInput").value = city;
      checkCityAqi(city);
    });
  });
});

async function loadLiveAQIData() {
    // Yahan apna asli AWS API Gateway ka Invoke URL paste karein
    const apiGatewayUrl = "https://YOUR_API_GATEWAY_URL/aqi"; 

    try {
        const res = await fetch(apiGatewayUrl);
        const data = await res.json();

        const today = data.today_aqi;
        const yesterday = data.yesterday_aqi;

        // Screen par AQI values update karein
        const todayEl = document.getElementById("todayVal");
        const yesterdayEl = document.getElementById("yesterdayVal");
        if (todayEl) todayEl.textContent = today;
        if (yesterdayEl) yesterdayEl.textContent = yesterday;

        // Difference aur percentage calculate karein
        const diff = today - yesterday;
        const pctChange = yesterday > 0 ? Math.abs(Math.round((diff / yesterday) * 100)) : 0;
        
        const lineEl = document.getElementById("hindiComparisonText");
        const badgeEl = document.getElementById("diffBadge");

        if (diff <= 0) {
            if (badgeEl) {
                badgeEl.textContent = `↓ ${Math.abs(diff)} pts (${pctChange}% better)`;
                badgeEl.className = "diff-badge badge-better";
            }
            if (lineEl) {
                lineEl.textContent = `The air is ${pctChange}% cleaner today`;
            }
        } else {
            if (badgeEl) {
                badgeEl.textContent = `↑ +${diff} pts (${pctChange}% worse)`;
                badgeEl.className = "diff-badge badge-worse";
            }
            if (lineEl) {
                lineEl.textContent = `The air is ${pctChange}% worse today`;
            }
        }
    } catch (err) {
        console.error("API Gateway error:", err);
    }
}

// Page load hote hi run karein
window.addEventListener("DOMContentLoaded", loadLiveAQIData);