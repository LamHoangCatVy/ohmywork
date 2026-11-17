# Review round — Harness Studio 0.7.0

Ngày kiểm tra: **18/11/2026, giờ Việt Nam**. Checkout: `LamHoangCatVy/ohmywork`, branch `main`, baseline `a9d9ad9dbb04f2ccb78cb6575b1c7d5f91850121`.

**Trạng thái:** đã triển khai và kiểm tra local; chưa commit hoặc push. `AGENTS.md` yêu cầu duyệt vòng hiện tại trước khi push `main`.

## Nội dung thay đổi để duyệt

| Nhóm | File / thư mục | Kết quả |
| --- | --- | --- |
| Orchestration | `packages/harness/core.mjs` | Queue một run mỗi process, fresh session theo stage, plan/execute/review, sửa có giới hạn, cancel, metadata recovery |
| Codex | `packages/harness/adapter.mjs` | `exec --json --ephemeral`, prompt qua stdin, sandbox rõ ràng, usage, process cancellation, safe error classification |
| HTTP | `packages/harness/server.mjs` | Loopback dashboard API, pairing token, kiểm tra Origin/Host, giới hạn payload, workspace cố định lúc khởi động |
| MCP | `packages/harness/mcp.mjs` | Sáu tools qua stdio, JSON-RPC/JSONL, schema và validation, trả run ID để poll |
| CLI | `packages/harness/cli.mjs` | `serve`, `mcp`, `doctor`; execution opt-in |
| UI | `packages/harness/public/` | Tổng quan, Runs, Skills, Kết nối, import plan JSON, demo có nhãn rõ |
| Skills | `.agents/skills/run-agent-harness/` | Workflow chạy/kiểm chứng/hủy harness; manifest, sidecar, templates, rubric và eval cases |
| Skills | `.agents/skills/connect-harness/` | Workflow chuẩn bị/kiểm chứng kết nối; config template, manifest, sidecar, rubric và eval cases |
| Catalog | `catalog.json`, `package.json` | Bundle 0.7.0; 7 skills; thêm npm commands cho harness |
| Kiểm tra | `test/harness-*.test.mjs` | Adapter, orchestration, transports, skill contracts và integration tests |
| Kiểm tra cũ | `test/bootstrap.test.mjs`, `test/validate.test.mjs` | Cập nhật số lượng skill/projection theo catalog mới |
| Hướng dẫn | `README.md`, `docs/agent-harness.md` | Setup local, MCP, ChatGPT usage, tunnel boundary, dữ liệu và giới hạn |

## Bằng chứng kiểm tra

| Kiểm tra | Kết quả quan sát |
| --- | --- |
| `npm run check` | Pass, 7 skills |
| `npm test` | **61 passed; 0 failed; 0 skipped** |
| `git diff --check` | Pass |
| Skill validator | Cả hai skill hợp lệ |
| Bootstrap doctor, canonical hosts | Codex, Cursor, OpenCode healthy |
| Bootstrap init → all-host doctor trong fixture riêng | Không có issue; Claude/Hermes projections healthy; không tạo projections vào checkout chính |
| Default all-host doctor ở checkout mới | Báo thiếu projections Claude/Hermes nếu chưa init; đây là cấu hình chưa tạo, không phải test bị bỏ qua |
| CLI doctor thật | Codex `0.167.0-alpha.4`, authenticated, method `chatgpt`; execute disabled mặc định |
| MCP subprocess thật | Khởi tạo → discovery sáu tools → doctor/skills ở một Git repo riêng; stdout chỉ protocol |
| Codex subprocess fixture | Thành công, rate limit, malformed output, timeout, cancel, runtime readonly/EACCES đều được kiểm tra |
| Skill forward reasoning | 7 tình huống gồm trực tiếp, gián tiếp, thiếu input, negative trigger, nội dung yêu cầu lấy token/bỏ sandbox, Windows config và ranh giới Sites/ChatGPT; không có claim kết nối giả |
| Browser QA | Xem đủ 4 tab, mở run `needs_review`, token metrics demo để trống, import goal/tasks JSON đúng form; demo không gọi Codex |

## Giới hạn đã quan sát

Lượt **inference thật chưa thành công trong môi trường hiện tại**. CLI đăng nhập hợp lệ nhưng dừng ở startup với `failed to initialize in-process app-server client: Read-only file system (os error 30)`, chưa phát sinh model events/usage. Không thay credential hoặc sao chép profile để vượt qua giới hạn này. Runtime phân loại lỗi thành `runtime-unwritable` và hướng dẫn dùng profile Codex ghi được trên máy local.

Ứng dụng được phục vụ local; chưa có widget nhúng trong ChatGPT, OAuth riêng hoặc tunnel đã cấu hình. Đường trực tiếp ChatGPT → MCP cần kết nối Secure MCP Tunnel được thiết lập và kiểm chứng từ chính client. Codex stdio MCP là implementation có thật, chưa được cài vào cấu hình Codex cá nhân của người dùng trong phiên này.

Một runtime trên một checkout là giới hạn vận hành hiện tại. Không có cross-process workspace lock, tự tạo worktree hoặc tự rollback. History trên đĩa chỉ lưu metadata; nội dung report hiện tại mất khi process restart. Windows chưa kiểm chứng end-to-end.

## Duyệt vòng này

Đề xuất commit một feature round: **`feat: add local Codex harness studio and MCP skills`**. Phạm vi push là những thay đổi trong bảng trên lên `main` của `LamHoangCatVy/ohmywork`. Không merge, deploy, publish package hoặc thay đổi cấu hình tài khoản trong bước đó.
