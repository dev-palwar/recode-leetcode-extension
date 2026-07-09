(() => {
  // Waits for LeetCode problem table or page data
  const fetchACProblems = () => {
    let problems = [];

    // Some pages embed the data in window.pageData or similar
    if (window.__lcData) {
      const allProblems = window.__lcData.stat_status_pairs;
      problems = allProblems.filter((p) => p.status === "ac");

      console.log(problems);
    } else {
      // fallback: scrape the problem table
      const rows = document.querySelectorAll(".reactable-data tr");
      rows.forEach((row) => {
        const statusCell = row.querySelector("td:nth-child(3)");
        if (statusCell?.textContent?.includes("✔")) {
          problems.push({
            title: row.querySelector("td:nth-child(2)")?.textContent,
            id: row.getAttribute("data-question-id"),
          });
        }
      });
    }

    return problems;
  };

  const acProblems = fetchACProblems();

  // Send to background or server
  chrome.storage.local.set({ acProblems });
})();
