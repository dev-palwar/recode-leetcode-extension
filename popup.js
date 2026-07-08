document
  .getElementById("fetchBtn")
  .addEventListener("click", fetchSolvedProblems);
document.getElementById("exportBtn").addEventListener("click", exportToApp);

// Loads API endpoint from storage
window.addEventListener("load", async () => {
  const settings = await browser.storage.local.get(["apiEndpoint"]);
  if (settings.apiEndpoint) {
    document.getElementById("apiEndpoint").value = settings.apiEndpoint;
  } else {
    document.getElementById("apiEndpoint").value =
      "https://recode.devpalwar.me/api/leetcode";
  }

  // Loads cached problems
  loadCachedProblems();
});

// Saves API endpoint when changed
document.getElementById("apiEndpoint").addEventListener("change", async (e) => {
  await browser.storage.local.set({ apiEndpoint: e.target.value });
});

async function fetchSolvedProblems() {
  const fetchBtn = document.getElementById("fetchBtn");
  const loading = document.getElementById("loading");
  const errorDiv = document.getElementById("error");
  const statsDiv = document.getElementById("stats");
  const problemsDiv = document.getElementById("problems");

  // Resets UI
  fetchBtn.disabled = true;
  loading.style.display = "block";
  errorDiv.style.display = "none";
  statsDiv.style.display = "none";
  problemsDiv.innerHTML = "";

  try {
    // Gets user's username first
    const profileResponse = await fetch(
      "https://leetcode.com/api/problems/all/",
      {
        credentials: "include",
      },
    );

    if (!profileResponse.ok) {
      throw new Error(
        "Failed to fetch data. Make sure you are logged in to LeetCode.",
      );
    }

    const data = await profileResponse.json();

    // Filters solved problems
    const solvedProblems = data.stat_status_pairs.filter(
      (problem) => problem.status === "ac",
    );

    // Displays stats
    statsDiv.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">Total Solved:</span> ${solvedProblems.length}
      </div>
      <div class="stat-item">
        <span class="stat-label">Total Problems:</span> ${data.stat_status_pairs.length}
      </div>
    `;
    statsDiv.style.display = "block";

    // Displays problems
    if (solvedProblems.length === 0) {
      problemsDiv.innerHTML =
        "<p>No solved problems found.</p> <p>Or maybe you're not logged in Leetcode.</p>";
    } else {
      // Sorts by frontend_question_id
      solvedProblems.sort(
        (a, b) => a.stat.frontend_question_id - b.stat.frontend_question_id,
      );

      solvedProblems.forEach((problem) => {
        const problemItem = document.createElement("div");
        problemItem.className = "problem-item";

        const difficulty = getDifficultyText(problem.difficulty.level);
        const difficultyClass = `difficulty-${difficulty.toLowerCase()}`;

        problemItem.innerHTML = `
          <div class="problem-title">
            ${problem.stat.frontend_question_id}. ${
              problem.stat.question__title
            }
          </div>
          <div class="problem-meta">
            <span class="${difficultyClass}">${difficulty}</span> |
            AC Rate: ${(
              (problem.stat.total_acs / problem.stat.total_submitted) *
              100
            ).toFixed(1)}%
          </div>
        `;

        problemsDiv.appendChild(problemItem);
      });
    }

    // Saves to storage
    browser.storage.local.set({
      solvedProblems: solvedProblems,
      lastFetched: new Date().toISOString(),
    });

    // Shows export button
    document.getElementById("exportBtn").style.display = "block";
  } catch (error) {
    errorDiv.textContent = error.message;
    errorDiv.style.display = "block";
    console.error("Error:", error);
  } finally {
    loading.style.display = "none";
    fetchBtn.disabled = false;
  }
}

async function exportToApp() {
  const exportBtn = document.getElementById("exportBtn");
  const loading = document.getElementById("loading");
  const errorDiv = document.getElementById("error");
  const successDiv = document.getElementById("success");
  const apiEndpoint = document.getElementById("apiEndpoint").value;

  // Resets UI
  exportBtn.disabled = true;
  loading.style.display = "block";
  errorDiv.style.display = "none";
  successDiv.style.display = "none";

  try {
    // Gets stored data
    const data = await browser.storage.local.get([
      "solvedProblems",
      "lastFetched",
    ]);

    if (!data.solvedProblems || data.solvedProblems.length === 0) {
      throw new Error("No data to export. Please fetch solved problems first.");
    }

    // Formats data for export
    const exportData = {
      totalSolved: data.solvedProblems.length,
      lastFetched: data.lastFetched,
      problems: data.solvedProblems.map((p) => ({
        id: p.stat.frontend_question_id,
        title: p.stat.question__title,
        titleSlug: p.stat.question__title_slug,
        difficulty: getDifficultyText(p.difficulty.level),
        difficultyLevel: p.difficulty.level,
        acceptanceRate: parseFloat(
          ((p.stat.total_acs / p.stat.total_submitted) * 100).toFixed(1),
        ),
        totalAccepted: p.stat.total_acs,
        totalSubmissions: p.stat.total_submitted,
        isPaidOnly: p.paid_only,
      })),
    };

    // Sends to App
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(exportData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to export: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    successDiv.textContent = `✓ Successfully exported ${data.solvedProblems.length} problems!`;
    successDiv.style.display = "block";

    console.log("Export successful:", result);
  } catch (error) {
    errorDiv.textContent = error.message;
    errorDiv.style.display = "block";
    console.error("Export error:", error);
  } finally {
    loading.style.display = "none";
    exportBtn.disabled = false;
  }
}

function getDifficultyText(level) {
  switch (level) {
    case 1:
      return "Easy";
    case 2:
      return "Medium";
    case 3:
      return "Hard";
    default:
      return "Unknown";
  }
}

// Loads cached data on popup open
async function loadCachedProblems() {
  const data = await browser.storage.local.get([
    "solvedProblems",
    "lastFetched",
  ]);

  if (data.solvedProblems && data.solvedProblems.length > 0) {
    const statsDiv = document.getElementById("stats");
    const problemsDiv = document.getElementById("problems");

    statsDiv.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">Total Solved:</span> ${
          data.solvedProblems.length
        }
      </div>
      <div class="stat-item">
        <span class="stat-label">Last Updated:</span> ${new Date(
          data.lastFetched,
        ).toLocaleString()}
      </div>
    `;
    statsDiv.style.display = "block";

    data.solvedProblems.forEach((problem) => {
      const problemItem = document.createElement("div");
      problemItem.className = "problem-item";

      const difficulty = getDifficultyText(problem.difficulty.level);
      const difficultyClass = `difficulty-${difficulty.toLowerCase()}`;

      problemItem.innerHTML = `
        <div class="problem-title">
          ${problem.stat.frontend_question_id}. ${problem.stat.question__title}
        </div>
        <div class="problem-meta">
          <span class="${difficultyClass}">${difficulty}</span> |
          AC Rate: ${(
            (problem.stat.total_acs / problem.stat.total_submitted) *
            100
          ).toFixed(1)}%
        </div>
      `;

      problemsDiv.appendChild(problemItem);
    });

    // Shows export button if data exists
    document.getElementById("exportBtn").style.display = "block";
  }
}
