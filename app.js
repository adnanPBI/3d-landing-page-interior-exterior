import { EnergyScene, CHAPTERS, chapterAt, detectQuality } from "./scene.js";
import { mountExploreUI } from "./explore-ui.js";

const state = { progress: 0, mouse: { x: 0, y: 0 }, exploring: false, chapter: 0, mode: "pending", ready: false };
const qs = (id) => document.getElementById(id);
const app = qs("app");
const canvas = qs("webgl");
const sceneLayer = qs("scene-layer");
const loader = qs("loader");
const fallback = qs("fallback");
const heroCopy = qs("hero-copy");
const sceneStatus = qs("scene-status");
const explorePanel = qs("explore-panel");
let activeScene = null;
let facilityUI = null;
const rail = qs("chapter-rail");
const scrollCue = qs("scroll-cue");

const chapterNodes = {
  kicker: qs("kicker"), title: qs("title"), body: qs("body-copy"), frame: qs("frame"),
  statusKicker: qs("status-kicker"), exploreLabel: qs("explore-label"), exploreTitle: qs("explore-title"),
  m1v: qs("metric-1-value"), m1l: qs("metric-1-label"), m2v: qs("metric-2-value"), m2l: qs("metric-2-label"), counter: qs("counter")
};

const vertical = qs("vertical-progress");
CHAPTERS.forEach((item, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.index = String(index);
  button.setAttribute("aria-label", `Go to ${item.kicker}`);
  button.innerHTML = `<span>${item.index}</span><i></i>`;
  button.addEventListener("click", () => goTo(index));
  vertical.appendChild(button);
});

const tabs = qs("chapter-tabs");
CHAPTERS.slice(1, 5).forEach((item, offset) => {
  const index = offset + 1;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.index = String(index);
  button.innerHTML = `<small>${String(offset + 1).padStart(2,"0")}</small><strong>${item.kicker}</strong><span>${item.title}</span>`;
  button.addEventListener("click", () => goTo(index));
  tabs.appendChild(button);
});

document.querySelectorAll("[data-go]").forEach((node) => {
  node.addEventListener("click", () => goTo(Number(node.dataset.go || 0)));
});

function renderChapter(index) {
  state.chapter = index;
  const active = CHAPTERS[index] || CHAPTERS[0];
  chapterNodes.kicker.textContent = active.kicker;
  chapterNodes.title.textContent = active.title;
  chapterNodes.body.textContent = active.body;
  chapterNodes.frame.textContent = `FRAME ${active.index}`;
  chapterNodes.statusKicker.textContent = active.kicker;
  chapterNodes.exploreLabel.textContent = active.explore;
  chapterNodes.exploreTitle.textContent = active.title;
  chapterNodes.m1v.textContent = active.metrics[0][0];
  chapterNodes.m1l.textContent = active.metrics[0][1];
  chapterNodes.m2v.textContent = active.metrics[1][0];
  chapterNodes.m2l.textContent = active.metrics[1][1];
  chapterNodes.counter.textContent = String(Math.min(4, Math.max(1, index))).padStart(2, "0");
  [...vertical.children].forEach((node, i) => node.classList.toggle("active", i === index));
  [...tabs.children].forEach((node) => node.classList.toggle("active", Number(node.dataset.index) === index));
}

function maxScroll() { return Math.max(1, document.documentElement.scrollHeight - innerHeight); }
function goTo(index) {
  const target = CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, index))];
  if (!target) return;
  if (state.exploring) setExplore(false);
  window.scrollTo({ top: target.at * maxScroll(), behavior: "smooth" });
}

function updateScroll() {
  if (state.exploring) return;
  state.progress = Math.min(1, Math.max(0, scrollY / maxScroll()));
  const next = chapterAt(state.progress);
  if (next !== state.chapter) renderChapter(next);
}

function setExplore(next) {
  if (!next && activeScene?.interiorMode) activeScene.exitInterior();
  if (next && !(state.mode === "high" || state.mode === "lite")) return;
  state.exploring = next;
  app.classList.toggle("is-exploring", next);
  sceneLayer.classList.toggle("scene-interactive", next);
  document.documentElement.classList.toggle("explore-locked", next);
  document.body.classList.toggle("explore-locked", next);
  heroCopy.classList.toggle("hero-copy-muted", next);
  rail.classList.toggle("rail-muted", next);
  sceneStatus.hidden = next;
  explorePanel.hidden = !next;
  scrollCue.hidden = next;
  facilityUI?.update();
}

qs("explore").addEventListener("click", () => setExplore(true));
qs("resume").addEventListener("click", () => setExplore(false));
qs("prev").addEventListener("click", () => goTo(state.chapter - 1));
qs("next").addEventListener("click", () => goTo(state.chapter + 1));
window.addEventListener("scroll", updateScroll, { passive: true });
window.addEventListener("pointermove", (event) => {
  state.mouse.x = (event.clientX / Math.max(1, innerWidth)) * 2 - 1;
  state.mouse.y = -((event.clientY / Math.max(1, innerHeight)) * 2 - 1);
}, { passive: true });
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.exploring) {
    event.preventDefault();
    if (activeScene?.interiorMode) {activeScene.exitInterior();facilityUI?.update();}
    else setExplore(false);
    return;
  }
  if (state.exploring) return;
  if (event.key === "ArrowDown" || event.key === "PageDown") { event.preventDefault(); goTo(state.chapter + 1); }
  if (event.key === "ArrowUp" || event.key === "PageUp") { event.preventDefault(); goTo(state.chapter - 1); }
});

renderChapter(0);
updateScroll();
state.mode = detectQuality();
qs("quality-label").textContent = state.mode === "high" ? "Cinematic quality" : state.mode === "lite" ? "Adaptive quality" : "Static fallback";

if (state.mode === "high" || state.mode === "lite") {
  try {
    const scene = new EnergyScene(canvas, {
      quality: state.mode,
      getProgress: () => state.progress,
      getMouse: () => state.mouse,
      getExploring: () => state.exploring,
      getChapter: () => state.chapter,
      onReady: () => { state.ready = true; loader.hidden = true; },
    });
    activeScene = scene;
    facilityUI = mountExploreUI(scene, explorePanel);
    scene.start();
    window.addEventListener("beforeunload", () => {facilityUI?.dispose();scene.dispose();}, { once: true });
  } catch (error) {
    console.error(error);
    state.mode = "fallback";
    loader.hidden = true;
    fallback.hidden = false;
    canvas.hidden = true;
    qs("explore").disabled = true;
  }
} else {
  loader.hidden = true;
  fallback.hidden = false;
  canvas.hidden = true;
  qs("explore").disabled = true;
}
