/* Browser state is deliberately ephemeral: no tokens, prompts, or results in storage. */
"use strict";

const $ = (selector) => document.querySelector(selector);
const state = { token: "", doctor: null, skills: [], runs: [], selected: null, demo: false, names: new Map(), polling: false };
const statusLabels = { queued: "Đang chờ", running: "Đang chạy", completed: "Hoàn tất", needs_review: "Cần review", failed: "Thất bại", cancelled: "Đã dừng", interrupted: "Gián đoạn" };
const stageLabels = { plan: "Lập kế hoạch", execute: "Thực thi", review: "Review", repair: "Sửa theo review", queued: "Đang chờ" };
const activeStatuses = new Set(["queued", "running"]);
let noticeTimeout;

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = String(text);
  return element;
}

function notice(message, error = false, sticky = false) {
  clearTimeout(noticeTimeout);
  const element = $("#notice");
  element.textContent = message;
  element.classList.toggle("error", error);
  element.hidden = false;
  if (!sticky) noticeTimeout = setTimeout(() => { element.hidden = true; }, 8000);
}

function showView(view) {
  if (!["overview", "runs", "skills", "connect"].includes(view)) view = "overview";
  document.querySelectorAll(".view").forEach((element) => { element.hidden = element.id !== `view-${view}`; });
  document.querySelectorAll(".nav-item").forEach((element) => element.classList.toggle("active", element.dataset.view === view));
  $("#page-label").textContent = { overview: "Tổng quan", runs: "Runs", skills: "Skills", connect: "Kết nối" }[view];
  if (location.hash !== `#${view}`) history.replaceState(null, "", `#${view}`);
}

async function api(route, options = {}, token = state.token) {
  if (!token) throw new Error("Hãy ghép nối bằng token trong terminal trước khi sử dụng.");
  const response = await fetch(route, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers },
    cache: "no-store",
    credentials: "omit",
  });
  let data;
  try { data = await response.json(); } catch { throw new Error(`Server trả về phản hồi không hợp lệ (${response.status}).`); }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("Pairing token không đúng, hoặc kết nối bị từ chối. Kiểm tra token và địa chỉ local của server.");
    const message = typeof data.error === "string" ? data.error : data.error?.message;
    throw new Error(message || `Yêu cầu thất bại (${response.status}).`);
  }
  return data;
}

function emptyState(title, description, action) {
  const wrapper = node("div", "empty-state");
  wrapper.append(node("span", "empty-symbol", "↳"), node("strong", "", title), node("p", "", description));
  if (action) {
    const button = node("button", "text-button", action.label);
    button.type = "button";
    button.addEventListener("click", action.run);
    wrapper.append(button);
  }
  return wrapper;
}

function renderRuntime() {
  const doctor = state.doctor;
  const codex = doctor?.codex;
  const connection = $("#connection-state");
  connection.replaceChildren(node("i"), document.createTextNode(state.demo ? "Demo · local UI" : state.token ? "Đã ghép nối · local" : "Chưa ghép nối"));
  connection.classList.toggle("connected", !!state.token && !state.demo);
  connection.classList.toggle("demo", state.demo);
  $("#pair-button").textContent = state.token ? "Đổi kết nối" : "Kết nối máy";
  $("#engine-status").textContent = state.demo ? "Dữ liệu mẫu" : !doctor ? "Chưa kiểm tra" : codex?.available ? "Sẵn sàng" : "Chưa cài đặt";
  $("#engine-status").classList.toggle("good", !!codex?.available && !state.demo);
  $("#engine-description").textContent = !doctor ? "Ghép nối để kiểm tra Codex và phương thức đăng nhập trên máy này." : state.demo ? "Demo minh họa giao diện. Không gọi Codex và không sử dụng usage." : !codex?.available ? "Chưa tìm thấy Codex CLI. Cài Codex trên máy chạy server rồi kiểm tra lại." : codex.authenticated === false ? "Codex chưa đăng nhập. Chạy codex login trong terminal để dùng tài khoản ChatGPT." : `Phiên bản ${codex.version || "không xác định"}. Codex quản lý đăng nhập và giới hạn usage của tài khoản.`;
  $("#auth-method").textContent = codex?.method || (codex?.authenticated ? "Đã đăng nhập" : doctor ? "Chưa đăng nhập" : "—");
  const workspace = doctor?.workspaceRoot || "Chưa ghép nối";
  $("#workspace-path").textContent = workspace;
  $("#workspace-path").title = workspace;
  $("#execution-policy").textContent = !doctor ? "Chưa kiểm tra" : doctor.allowExecution ? "Cho phép sửa workspace" : "Chỉ Plan · read-only";
  $("#demo-label").hidden = !state.demo;
  renderMode();
}

function renderMode() {
  const mode = $("input[name=mode]:checked").value;
  document.querySelectorAll(".mode-option").forEach((element) => element.classList.toggle("selected", element.querySelector("input").checked));
  const permission = $("#permission-note");
  const executionBlocked = mode === "execute" && !state.doctor?.allowExecution;
  permission.classList.toggle("warn", executionBlocked);
  permission.textContent = mode === "plan" ? "↳ Plan chỉ đọc workspace. Mỗi stage dùng một phiên Codex mới." : executionBlocked ? "↳ Server chưa cho phép sửa code. Khởi động với --allow-execution để dùng chế độ này." : "↳ Codex có thể sửa code trong workspace đã chọn. Review dùng sandbox read-only.";
  $("#start-run").replaceChildren(document.createTextNode(mode === "plan" ? "Tạo plan " : "Chạy harness "), node("span", "", "↗"));
}

function dateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "—" : new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function runTitle(run) {
  return state.names.get(run.id) || run.title || (run.mode === "plan" ? "Lập kế hoạch" : "Execute & review") + ` · ${String(run.id).slice(0, 8)}`;
}

function runRow(run) {
  const button = node("button", "run-row");
  button.type = "button";
  button.setAttribute("aria-label", `Xem run ${run.id}`);
  const name = node("span");
  name.append(node("span", "run-name", runTitle(run)), node("span", "run-subtitle", `${run.mode === "plan" ? "PLAN" : "EXECUTE"} · ${stageLabels[run.stage] || run.stage || "Chờ stage"} · vòng ${run.iteration || 0}`));
  const badge = node("span", "run-status", statusLabels[run.status] || run.status);
  if (Object.hasOwn(statusLabels, run.status)) badge.classList.add(run.status);
  button.append(node("span", "run-icon", run.mode === "plan" ? "◇" : "▷"), name, badge, node("time", "run-date", dateLabel(run.createdAt)), node("span", "run-arrow", "↗"));
  button.addEventListener("click", () => selectRun(run.id));
  return button;
}

function renderRuns() {
  $("#nav-run-count").textContent = state.runs.length;
  for (const [selector, limit] of [["#recent-runs", 3], ["#all-runs", 100]]) {
    const target = $(selector);
    target.replaceChildren();
    if (!state.runs.length) {
      target.append(emptyState(state.token ? "Chưa có run nào" : "Sẵn sàng cho run đầu tiên", state.token ? "Viết một mục tiêu ở Tổng quan để tạo plan. Chỉ kết quả thực tế từ Codex mới xuất hiện ở đây." : "Ghép nối với local server để xem lịch sử và bắt đầu công việc.", { label: state.token ? "Tạo plan đầu tiên ↗" : "Kết nối máy ↗", run: state.token ? () => { showView("overview"); $("#goal").focus(); } : openPair }));
      continue;
    }
    const list = node("div", "run-list");
    state.runs.slice(0, limit).forEach((run) => list.append(runRow(run)));
    target.append(list);
  }
}

function renderSkills() {
  const grid = $("#skills-grid");
  grid.replaceChildren();
  if (!state.skills.length) {
    grid.append(emptyState(state.token ? "Catalog chưa có skill" : "Catalog chờ kết nối", state.token ? "Kiểm tra catalog.json và thư mục .agents/skills trong bundle OhMyWork." : "Ghép nối để đọc danh sách skills thực tế. Ứng dụng không tạo danh sách giả."));
    return;
  }
  for (const skill of state.skills) {
    const card = node("article", "card skill-card");
    const metadata = skill.capability || skill.metadata || skill;
    const footer = node("div", "skill-footer");
    footer.append(node("span", "", String(skill.id || skill.name || "skill")), node("span", "", metadata.maturity || "experimental"));
    card.append(node("span", "skill-symbol", "✳"), node("h2", "", metadata.title || skill.title || skill.name || skill.id), node("p", "", metadata.summary || metadata.description || "Portable capability từ catalog OhMyWork."), footer);
    grid.append(card);
  }
}

function stringify(value) {
  if (value === undefined || value === null || value === "") return "Chưa có kết quả. Run đang chờ hoặc chưa hoàn tất stage đầu tiên.";
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function renderDetail(run) {
  if (!run) return;
  $("#run-detail").hidden = false;
  $("#detail-title").textContent = runTitle(run);
  const meta = $("#detail-meta");
  meta.replaceChildren(...[statusLabels[run.status] || run.status, `Stage: ${stageLabels[run.stage] || run.stage || "—"}`, `Vòng: ${run.iteration || 0}`, dateLabel(run.createdAt), run.id].map((value) => node("span", "", value)));
  $("#cancel-run").hidden = state.demo || !activeStatuses.has(run.status);
  const usage = $("#run-usage");
  usage.replaceChildren();
  for (const [label, key] of [["INPUT TOKENS", "input_tokens"], ["OUTPUT TOKENS", "output_tokens"], ["CACHED INPUT", "cached_input_tokens"]]) {
    const box = node("div", "usage-box");
    const amount = run.usage?.[key];
    box.append(node("small", "", label), node("strong", "", Number.isFinite(amount) ? new Intl.NumberFormat("vi-VN").format(amount) : "—"));
    usage.append(box);
  }
  const events = $("#run-events");
  events.replaceChildren();
  if (!run.events?.length) events.append(node("p", "event", "Chưa có event trong phiên này. Lịch sử sau khi restart chỉ giữ metadata."));
  for (const event of (run.events || []).slice(-100)) {
    const content = typeof event === "string" ? event : [event.time || event.timestamp ? dateLabel(event.time || event.timestamp) : "", event.stage || event.type || "", event.message || event.summary || event.status || ""].filter(Boolean).join(" · ");
    events.append(node("div", "event", content || stringify(event)));
  }
  $("#run-result").textContent = run.error ? stringify(run.error) : stringify(run.result);
}

async function selectRun(id) {
  state.selected = id;
  showView("runs");
  try {
    const run = state.demo ? state.runs.find((item) => item.id === id) : await api(`/api/runs/${encodeURIComponent(id)}`);
    if (state.selected === id) renderDetail(run.run || run);
  } catch (error) { notice(error.message, true); }
}

async function refreshAll() {
  if (!state.token || state.demo) return;
  const [doctor, skills, runs] = await Promise.all([api("/api/doctor"), api("/api/skills"), api("/api/runs")]);
  state.doctor = doctor;
  state.skills = Array.isArray(skills) ? skills : skills.skills || [];
  state.runs = Array.isArray(runs) ? runs : runs.runs || [];
  renderRuntime(); renderRuns(); renderSkills();
}

function openPair() {
  $("#pair-error").textContent = "";
  $("#pair-token").value = "";
  $("#pair-dialog").showModal();
  $("#pair-token").focus();
}

function openImport() {
  $("#import-error").textContent = "";
  $("#import-dialog").showModal();
  $("#plan-json").focus();
}

document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.go)));
window.addEventListener("hashchange", () => showView(location.hash.slice(1)));
$(".brand").addEventListener("click", () => showView("overview"));
$("#pair-button").addEventListener("click", openPair);
$("#connect-pair").addEventListener("click", openPair);
$("#close-pair").addEventListener("click", () => $("#pair-dialog").close());
$("#close-import").addEventListener("click", () => $("#import-dialog").close());
$("#import-plan").addEventListener("click", openImport);
$("#connect-import").addEventListener("click", openImport);
document.querySelectorAll("input[name=mode]").forEach((input) => input.addEventListener("change", renderMode));

$("#pair-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const token = $("#pair-token").value.trim();
  $("#submit-pair").disabled = true;
  $("#pair-error").textContent = "";
  try {
    const doctor = await api("/api/doctor", {}, token);
    state.token = token; state.demo = false; state.doctor = doctor; state.selected = null;
    $("#pair-token").value = "";
    $("#pair-dialog").close();
    $("#run-detail").hidden = true;
    renderRuntime();
    await refreshAll();
    notice("Đã ghép nối với local server. Pairing token chỉ được giữ trong tab này.");
  } catch (error) { $("#pair-error").textContent = error.message; }
  finally { $("#submit-pair").disabled = false; }
});

$("#run-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.demo) { notice("Đây là demo giao diện, không chạy Codex. Ghép nối với local server để tạo run thực tế.", true); return; }
  if (!state.token) { openPair(); return; }
  const goal = $("#goal").value.trim();
  const mode = $("input[name=mode]:checked").value;
  if (!goal) { $("#goal").focus(); return; }
  if (mode === "execute" && !state.doctor?.allowExecution) { notice("Server đang ở chế độ read-only. Khởi động với --allow-execution để cho phép sửa code.", true); return; }
  const tasks = $("#tasks").value.split(/\r?\n/).map((task) => task.trim()).filter(Boolean);
  const input = { goal, mode, maxIterations: Number($("#max-iterations").value), timeoutSeconds: Number($("#timeout-seconds").value) };
  if (tasks.length) input.tasks = tasks;
  $("#start-run").disabled = true;
  try {
    const response = await api("/api/runs", { method: "POST", body: JSON.stringify(input) });
    const run = response.run || response;
    if (!run.id) throw new Error("Server chưa trả về run ID hợp lệ.");
    state.names.set(run.id, goal.slice(0, 100));
    await refreshAll();
    await selectRun(run.id);
    notice("Đã xếp run vào hàng đợi. Bạn có thể theo dõi hoặc dừng từ màn hình này.");
  } catch (error) { notice(error.message, true); }
  finally { $("#start-run").disabled = false; }
});

$("#import-form").addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const value = JSON.parse($("#plan-json").value);
    if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.goal !== "string" || !value.goal.trim()) throw new Error("Plan cần có goal là chuỗi không rỗng.");
    if (value.goal.length > 20000) throw new Error("Goal vượt quá 20.000 ký tự.");
    if (value.tasks !== undefined && (!Array.isArray(value.tasks) || value.tasks.length > 24 || value.tasks.some((task) => typeof task !== "string" || !task.trim() || /[\r\n]/.test(task) || task.length > 2000))) throw new Error("tasks phải là mảng tối đa 24 chuỗi, mỗi task không rỗng, nằm trên một dòng và dài tối đa 2.000 ký tự.");
    $("#goal").value = value.goal;
    $("#tasks").value = (value.tasks || []).join("\n");
    if (value.tasks?.length) $(".advanced").open = true;
    $("#import-dialog").close();
    showView("overview");
    $("#goal").focus();
    notice("Đã điền plan vào form. Kiểm tra nội dung và chọn chế độ trước khi tạo run.");
  } catch (error) { $("#import-error").textContent = error instanceof SyntaxError ? "JSON chưa hợp lệ. Dán nội dung JSON thuần, không kèm dấu ``` của Markdown." : error.message; }
});

$("#cancel-run").addEventListener("click", async () => {
  if (!state.selected || state.demo) return;
  $("#cancel-run").disabled = true;
  try {
    await api(`/api/runs/${encodeURIComponent(state.selected)}/cancel`, { method: "POST", body: "{}" });
    await refreshAll();
    await selectRun(state.selected);
    notice("Đã gửi yêu cầu dừng run.");
  } catch (error) { notice(error.message, true); }
  finally { $("#cancel-run").disabled = false; }
});

async function manualRefresh() {
  if (state.demo) { notice("Demo · không chạy Codex. Ghép nối để xem trạng thái máy thực tế."); return; }
  if (!state.token) { openPair(); return; }
  try { await refreshAll(); if (state.selected) await selectRun(state.selected); notice("Đã cập nhật trạng thái từ local server."); }
  catch (error) { notice(error.message, true); }
}
$("#check-runtime").addEventListener("click", manualRefresh);
$("#refresh-runs").addEventListener("click", manualRefresh);
$("#copy-mcp").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText($("#mcp-command").textContent); notice("Đã sao chép lệnh. Thay các đường dẫn /absolute/path trước khi chạy."); }
  catch { const selection = window.getSelection(); const range = document.createRange(); range.selectNodeContents($("#mcp-command")); selection.removeAllRanges(); selection.addRange(range); notice("Trình duyệt chưa cho phép Clipboard. Lệnh đã được chọn để bạn sao chép."); }
});

$("#demo-button").addEventListener("click", () => {
  if (state.token) { notice("Bạn đang ghép nối với dữ liệu thực tế. Demo chỉ khả dụng trước khi ghép nối."); return; }
  state.demo = true;
  const now = new Date().toISOString();
  state.doctor = { workspaceRoot: "/demo/your-project", allowExecution: false, codex: { available: true, version: "demo", authenticated: true, method: "ChatGPT · minh họa" } };
  state.skills = [{ id: "run-agent-harness", title: "Run agent harness", summary: "Minh họa một skill điều phối plan, thực thi và review.", maturity: "demo" }, { id: "write-user-stories", title: "Write user stories", summary: "Minh họa capability biến yêu cầu thành những lát cắt sản phẩm có thể kiểm thử.", maturity: "demo" }, { id: "build-java-test-harness", title: "Build Java test harness", summary: "Minh họa capability thiết kế test catalog và bằng chứng kiểm thử.", maturity: "demo" }];
  state.runs = [{ id: "demo-plan-001", status: "completed", mode: "plan", createdAt: now, stage: "plan", iteration: 1, usage: {}, events: [{ stage: "plan", message: "Dữ liệu minh họa; không có model call." }], result: { tasks: ["Đọc hành vi hiện tại và thống nhất acceptance criteria", "Triển khai thay đổi theo từng task", "Chạy kiểm thử và review kết quả"] } }, { id: "demo-review-002", status: "needs_review", mode: "execute", createdAt: now, stage: "review", iteration: 3, usage: {}, events: [{ stage: "review", message: "Minh họa dừng khi hết vòng sửa; không tự đánh dấu hoàn tất." }], result: { verdict: "changes_requested", summary: "Demo: cần kiểm chứng thêm một trường hợp lỗi." } }];
  state.names.set("demo-plan-001", "Demo · Plan cho chức năng tìm kiếm");
  state.names.set("demo-review-002", "Demo · Review đến giới hạn đã đặt");
  renderRuntime(); renderRuns(); renderSkills();
  notice("Demo · không chạy Codex. Các runs và skills dưới đây chỉ minh họa giao diện; không phải trạng thái workspace.", false, true);
});

setInterval(async () => {
  if (!state.token || state.demo || document.hidden || state.polling) return;
  state.polling = true;
  try {
    const runs = await api("/api/runs");
    state.runs = Array.isArray(runs) ? runs : runs.runs || [];
    renderRuns();
    if (state.selected) {
      const selectedId = state.selected;
      const response = await api(`/api/runs/${encodeURIComponent(selectedId)}`);
      if (state.selected === selectedId) renderDetail(response.run || response);
    }
  } catch (error) { notice(`Kết nối bị gián đoạn: ${error.message}`, true, true); }
  finally { state.polling = false; }
}, 3000);

showView(location.hash.slice(1));
renderRuntime(); renderRuns(); renderSkills();
