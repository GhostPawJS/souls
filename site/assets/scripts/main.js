// Replays a recorded run of @ghostpaw/souls 0.3.0 (2026-10-24, fixed clock). Without this script every step and result stays visible.
const STATES = [{"rows": [{"k": "Level", "v": "1"}, {"k": "Trait 1", "v": "Read the PR description before the diff."}, {"k": "Trait 2", "v": "Say what breaks before naming style nits."}, {"k": "Pending shards", "v": "2"}, {"k": "Sources", "v": "1 of 2", "w": 0.5, "t": "violet"}, {"k": "Ready", "v": "no"}], "foot": "read.crystallizationReadiness(db)"}, {"rows": [{"k": "Level", "v": "1"}, {"k": "Trait 1", "v": "Read the PR description before the diff."}, {"k": "Trait 2", "v": "Say what breaks before naming style nits."}, {"k": "Pending shards", "v": "3"}, {"k": "Sources", "v": "1 of 2", "w": 0.5, "t": "violet"}, {"k": "Ready", "v": "no · one source"}], "foot": "Still only session shards."}, {"rows": [{"k": "Level", "v": "1"}, {"k": "Trait 1", "v": "Read the PR description before the diff."}, {"k": "Trait 2", "v": "Say what breaks before naming style nits."}, {"k": "Pending shards", "v": "4"}, {"k": "Sources", "v": "2 of 2", "w": 1, "t": "ward"}, {"k": "Ready", "v": "yes · 2 sources, 2 days", "t": "ward"}], "foot": "pendingCount 4, sourceDiversity 2, ageSpreadDays 2"}, {"rows": [{"k": "Level", "v": "1"}, {"k": "Trait 1", "v": "Read the PR description and its linked issue before the diff.", "t": "cyan"}, {"k": "Trait 2", "v": "Say what breaks before naming style nits."}, {"k": "Pending shards", "v": "4"}, {"k": "Sources", "v": "2 of 2", "w": 1, "t": "ward"}, {"k": "Ready", "v": "yes", "t": "ward"}], "foot": "Trait 1 revised, with its provenance."}, {"rows": [{"k": "Level", "v": "1 · plan refused", "t": "alarm"}, {"k": "Trait 1", "v": "Read the PR description and its linked issue before the diff."}, {"k": "Trait 2", "v": "Say what breaks before naming style nits."}, {"k": "Pending shards", "v": "4"}, {"k": "Sources", "v": "2 of 2", "w": 1, "t": "ward"}, {"k": "Ready", "v": "yes", "t": "ward"}], "foot": "Nothing changed. The plan forgot trait 1."}, {"rows": [{"k": "Level", "v": "2", "t": "cyan"}, {"k": "Trait 1", "v": "Read the PR description and its linked issue before the diff. (carried)"}, {"k": "Trait 2", "v": "in the essence now", "t": "violet"}, {"k": "Pending shards", "v": "4"}, {"k": "Sources", "v": "2 of 2", "w": 1, "t": "ward"}, {"k": "Ready", "v": "yes", "t": "ward"}], "foot": "Shards are not used up by a level-up."}, {"rows": [{"k": "Level", "v": "1 · reverted", "t": "ward"}, {"k": "Trait 1", "v": "Read the PR description and its linked issue before the diff."}, {"k": "Trait 2", "v": "Say what breaks before naming style nits."}, {"k": "Pending shards", "v": "4"}, {"k": "Sources", "v": "2 of 2", "w": 1, "t": "ward"}, {"k": "Ready", "v": "yes", "t": "ward"}], "foot": "Both traits are back."}];
(() => {
  const list = document.getElementById("state-list");
  const foot = document.getElementById("state-foot");
  const steps = Array.from(document.querySelectorAll(".step"));
  const reset = document.getElementById("reset");
  const status = document.getElementById("run-status");
  if (!list || !steps.length) return;
  const motion = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  let at = 0;

  function paint(i) {
    const s = STATES[i];
    list.textContent = "";
    for (const r of s.rows) {
      const li = document.createElement("li");
      if (r.t) li.className = "t-" + r.t;
      const k = document.createElement("span"); k.className = "k"; k.textContent = r.k;
      const v = document.createElement("span"); v.className = "v"; v.textContent = r.v;
      li.append(k, v);
      if (r.w != null) {
        const bar = document.createElement("span"); bar.className = "bar";
        const fill = document.createElement("i");
        bar.append(fill); li.append(bar);
        const w = Math.max(0, Math.min(1, r.w)) * 100 + "%";
        const from = list.dataset.prev && JSON.parse(list.dataset.prev)[r.k];
        fill.style.width = motion && from != null ? from : w;
        if (motion && from != null) requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = w; }));
      }
      list.append(li);
    }
    const prev = {};
    for (const r of s.rows) if (r.w != null) prev[r.k] = Math.max(0, Math.min(1, r.w)) * 100 + "%";
    list.dataset.prev = JSON.stringify(prev);
    if (foot) foot.textContent = s.foot || "";
  }

  function mark() {
    steps.forEach((el, i) => {
      el.classList.toggle("done", i < at);
      el.classList.toggle("next", i === at);
    });
    if (status) status.textContent = at < steps.length ? "Step " + (at + 1) + " of " + steps.length + " is next." : "All " + steps.length + " steps replayed.";
  }

  steps.forEach((el, i) => {
    const btn = el.querySelector(".run-btn");
    btn.addEventListener("click", () => {
      if (i !== at) return;
      at = i + 1;
      paint(at);
      mark();
      if (el.classList.contains("refused") && motion) {
        el.classList.add("flash");
        el.addEventListener("animationend", () => el.classList.remove("flash"), { once: true });
      }
      const next = steps[at] && steps[at].querySelector(".run-btn");
      const res = el.querySelector(".result");
      if (res) { res.setAttribute("tabindex", "-1"); res.focus({ preventScroll: true }); }
      if (next) next.setAttribute("aria-describedby", "run-status");
    });
  });
  if (reset) reset.addEventListener("click", () => { at = 0; list.dataset.prev = ""; paint(0); mark(); steps[0].querySelector(".run-btn").focus(); });
  paint(0);
  mark();

  document.querySelectorAll(".copy").forEach((b) => {
    b.addEventListener("click", async () => {
      const input = document.getElementById(b.dataset.copy);
      try { await navigator.clipboard.writeText(input.value); } catch { input.select(); document.execCommand("copy"); }
      const label = b.textContent;
      b.textContent = "Copied";
      setTimeout(() => { b.textContent = label; }, 1400);
    });
  });
})();
