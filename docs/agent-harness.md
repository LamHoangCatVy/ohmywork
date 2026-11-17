# OhMyWork Harness Studio

Ứng dụng local để biến yêu cầu thành kế hoạch, chạy Codex theo từng task, rồi review thay đổi. Cùng một runtime dùng được từ dashboard hoặc MCP. Đây là bản experimental cho một người dùng trên máy tin cậy, không phải dịch vụ thực thi code công khai.

## Chạy trên máy của bạn

Yêu cầu Node.js 20+, Git và Codex CLI hỗ trợ `exec --json --ephemeral --output-schema`. Bản phát triển được kiểm tra với Codex `0.167.0-alpha.4`; chạy doctor trước trên phiên bản khác. Không cần cài npm dependencies cho runtime này.

```bash
cd /path/to/ohmywork
codex login
npm run harness:doctor -- --workspace /path/to/project
npm run harness -- --workspace /path/to/project
```

Mở địa chỉ loopback in trong terminal, nhập pairing token của lần chạy đó. Token chỉ dùng để kết nối dashboard với runtime local; nó không phải token ChatGPT. Trạng thái đăng nhập lấy từ `codex login status`; ứng dụng không đọc file credential.

Chế độ mặc định chỉ lập kế hoạch. Khi đã chọn đúng repository và cho phép chỉnh sửa:

```bash
npm run harness -- --workspace /path/to/project --allow-execution
```

Execution chỉnh sửa trực tiếp checkout đã chọn. Hãy dùng một checkout/worktree riêng nếu muốn tách công việc; phiên bản này chưa tự tạo worktree, commit, push hoặc deploy. Dừng một run không hoàn tác những thay đổi đã ghi trước đó.

## ChatGPT usage có nghĩa gì?

Runtime gọi Codex CLI đang đăng nhập. Nếu `codex login status` cho biết **ChatGPT**, Codex sử dụng quyền truy cập và giới hạn tương ứng của tài khoản/workspace. Nếu CLI đang dùng API key thì cơ chế tính phí tương ứng vẫn áp dụng. Không suy ra entitlement từ tên model, không chuyển subscription thành API key, không đọc cookie hay tái sử dụng session trình duyệt.

Các số input/output/cached token là usage do Codex trả về cho những lượt chạy này. Chúng không phải số quota còn lại của gói ChatGPT và không được quy đổi thành phần trăm allowance hoặc số tiền.

OpenAI cũng có đường **Sign in with ChatGPT / ChatGPT plan usage** cho ứng dụng OSS và local. Bản này sử dụng đăng nhập sẵn có của CLI; chưa triển khai OAuth riêng, nút đăng nhập nhúng hay adapter app-server. Không có quyền đọc lịch sử hội thoại hoặc memory ChatGPT.

## Ba cách sử dụng

| Cách dùng | Đã có | Cần cấu hình thêm |
| --- | --- | --- |
| Dashboard local | Tạo plan, import plan JSON, chạy task, xem review/usage, hủy run, xem skills | Codex login và pairing token |
| MCP trong Codex | Sáu tools dùng chung core | Đăng ký stdio server bên dưới |
| ChatGPT điều phối | Copy/import plan JSON; MCP stdio có thể dùng qua Secure MCP Tunnel | Tunnel/client host và plugin cá nhân; chưa được tạo hoặc kết nối tự động |

Một website được host bằng Sites không tự có quyền spawn process hoặc truy cập filesystem trên laptop. Vì vậy executor nằm local. Giao diện của bản này cũng được phục vụ local; chưa phải widget nhúng trong ChatGPT.

## Cắm MCP vào Codex

Chọn tên server `ohmywork_harness` để cơ chế chống gọi đệ quy nhận diện chính xác:

```bash
codex mcp add ohmywork_harness -- node /absolute/path/ohmywork/packages/harness/cli.mjs mcp --workspace /absolute/path/project
codex mcp list
```

Muốn cho phép task chỉnh sửa file, thêm `--allow-execution` ở cuối lệnh đăng ký sau khi chọn đúng scope. Không đăng ký hai server cùng trỏ một workspace rồi chạy đồng thời.

```toml
[mcp_servers.ohmywork_harness]
command = "node"
args = ["/absolute/path/ohmywork/packages/harness/cli.mjs", "mcp", "--workspace", "/absolute/path/project"]
```

| Tool | Chức năng |
| --- | --- |
| `harness_doctor` | Phiên bản CLI, trạng thái đăng nhập, workspace, quyền execute |
| `harness_skills` | Skills được khai báo trong catalog của bundle |
| `harness_runs` | Danh sách run và trạng thái |
| `harness_get_run` | Chi tiết một run theo `id` |
| `harness_run` | Xếp hàng plan hoặc execute; trả về ngay |
| `harness_cancel` | Hủy run đang chờ hoặc đang chạy |

Ví dụ arguments của `harness_run`:

```json
{
  "goal": "Bổ sung idempotency cho API transfer trong repository demo",
  "mode": "plan",
  "maxIterations": 3,
  "timeoutSeconds": 600
}
```

Theo dõi bằng `harness_get_run` với ID được trả về. Để nhập kế hoạch đã thống nhất trong ChatGPT:

```json
{
  "goal": "Bổ sung idempotency cho API transfer trong repository demo",
  "mode": "execute",
  "tasks": [
    "Đọc contract hiện tại và thêm kiểm tra idempotency key",
    "Thêm test cho request lặp lại và key trùng nhưng payload khác"
  ],
  "maxIterations": 3,
  "timeoutSeconds": 600
}
```

Đây là ví dụ cho repository demo, không phải xác nhận về kiến trúc hay code VPBank. Không đưa dữ liệu khách hàng, credential hoặc thông tin nội bộ chưa được phép vào prompt.

## ChatGPT gọi harness local

Đường hướng dẫn là **Secure MCP Tunnel** tới stdio command ở trên. Cấu hình và kiểm tra tunnel theo tài liệu chính thức, rồi thêm custom MCP plugin trong ChatGPT. Phải chọn đúng organization/workspace, quyền tunnel và kiểm tra một tool read-only trước. Không dán pairing token dashboard vào hội thoại; dashboard API và MCP stdio là hai transport riêng.

Không mở port `4318` ra Internet để thay thế tunnel. HTTP API của dashboard dùng bearer token, bind loopback và kiểm tra Origin/Host; nó không triển khai OAuth hay Streamable HTTP MCP. `POST /api/runs` không phải endpoint `/mcp`. Việc đưa stdio qua tunnel còn cần chính sách xác thực và workspace phù hợp; bản này không tự cấp một URL remote.

## Vòng thực thi và trạng thái

1. `plan`: fresh Codex session, sandbox `read-only`, trả JSON task list.
2. `execute`: từng task trong fresh session, sandbox `workspace-write`.
3. `review`: fresh session `read-only`, đánh giá kết quả và diff; nếu cần sửa thì lặp trong budget.
4. Dừng ở `completed`, `needs_review`, `failed` hoặc `cancelled`. Run chưa xong khi khởi động lại được ghi nhận `interrupted`.

`completed` phản ánh kết quả workflow và review model, không phải chứng nhận mọi test đã pass. Đọc report và chạy các kiểm tra độc lập mà repository yêu cầu. Reviewer cùng model không tạo ra sự độc lập hoàn toàn. Task bị blocked, thiếu bằng chứng hoặc hết budget không được chuyển thành completed chỉ để kết thúc vòng lặp.

Giới hạn: một run hoạt động mỗi process, `maxIterations` từ 1–8, timeout mỗi lượt Codex từ 1–3600 giây, đầu ra được giới hạn. Không tự retry khi rate limit, lỗi auth hoặc lỗi execution. Budget iteration/timeout không phải giới hạn cứng số token hoặc chi phí. Các process riêng biệt chưa có distributed workspace lock; chỉ chạy một runtime writer cho mỗi checkout.

## Dữ liệu và quyền

- Snapshot trong `.ohmywork/harness` chỉ giữ metadata trạng thái/usage; không lưu goal, task prompts, raw stderr hoặc nội dung model. Report hiện tại nằm trong bộ nhớ runtime và mất khi restart.
- Codex child chạy `--ephemeral`; không chủ động tạo session history từ adapter. Credential vẫn do Codex quản lý. Code và file mà task chủ động tạo vẫn tồn tại trong workspace.
- MCP stdio tin cậy host đã launch server; dashboard yêu cầu pairing token. Không có multi-user RBAC hay remote OAuth server trong MVP.
- Sandbox thực tế do Codex và OS thực thi. Quyền của plugin/MCP khác trong cấu hình Codex vẫn cần được quản lý ở host; sandbox file không tự giới hạn mọi side effect của external tools.
- Child đặt dấu chống gọi harness lồng nhau và vô hiệu server `ohmywork_harness` đã biết. Không thể tự nhận diện mọi alias hoặc external agent launcher trong cấu hình tùy ý.
- Không tự commit/push/deploy. Không tự đọc credential để hiển thị UI, không log token hay prompt vào file tracking.

## Nguồn và quyết định thiết kế

Mã runtime được viết độc lập. Lấy ý tưởng fresh-task/review/bounded-loop từ [ralphex](https://github.com/umputun/ralphex), và tách ChatGPT control plane/Codex execution từ [codex-with-chatgpt](https://github.com/XiaoDuoYa/codex-with-chatgpt). Không bundle upstream hoặc sao chép prompt/source của họ.

- [Codex authentication](https://developers.openai.com/codex/auth/)
- [Codex non-interactive JSONL và structured output](https://developers.openai.com/codex/noninteractive/)
- [Codex MCP](https://developers.openai.com/codex/mcp/)
- [ChatGPT plan usage cho OSS/local](https://developers.openai.com/siwc/token-sharing-open-source)
- [Codex app-server với ChatGPT plan usage](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server)
- [Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)

## Kiểm tra

```bash
npm run check
npm test
node scripts/bootstrap.mjs doctor
npm run harness:doctor -- --workspace /path/to/project
```

Tests dùng fake Codex process/injected adapter để kiểm tra orchestration, JSONL, timeout, cancellation, review budget, metadata persistence và transport authorization. Một smoke run thật cần account, model và network khả dụng trên máy đang chạy; kết quả fixture không chứng minh entitlement của account.

Windows chưa được xác minh end-to-end. Khi dùng Windows, chọn binary Codex chạy trực tiếp được; adapter dùng `shell: false` nên npm shim `.cmd` có thể cần cách cài CLI phù hợp. Không đổi sang shell interpolation để chạy prompt.
