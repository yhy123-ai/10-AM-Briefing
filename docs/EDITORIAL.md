# 十点晨报编辑与运行规范

这是用户已经批准的持续任务。每天北京时间 09:00 准备、09:30 刷新截稿、10:00 发布并向本机配置的 QQ 邮箱投递。周末相同。任务需要这台电脑唤醒、联网且 Codex 运行；公网网站和 D1 历史档案不依赖本机开机。错过调度后，在下一次 Codex 定时任务执行时补查缺失日期；不保证电脑一开机立即执行。

## 每日编辑

1. 先运行 `python -X utf8 scripts/briefing.py missing` 核对最近7天已发布日期，查看 `scripts/briefing.py status` 的失败/未知状态。历史缺失只补网站，不能批量补发邮件。
2. 只检索 `lib/sources.ts` 白名单。时政保留新华、央视、政府网、外交部、AP、Reuters、BBC、联合国；金融保留央行、统计局、证监会、沪深交易所、披露易、财联社、第一财经、美联储、ECB、IMF、SEC，重大国际金融也可用AP/Reuters；AI保留全部A类来源。国内外不设比例。按社会影响和重要性、独立来源关注度、发布时间综合排序，并记录选择依据。不能把搜索引擎排名等同真实热度，不宣称获得全网精确热度榜。
3. 从截至当日09:30前24小时的报道中选择新事件或重大新进展。访问原文核实，不能只依据搜索摘要。官方自述、媒体分析、论文实验结果分别注明归属。论文预印本不写成已经定论的科学成果。逐条寻找支持背景、时间线和科普的资料，不猜测未来进展。
4. APPSO仅爱范儿中可核实属于APPSO的作者/栏目文章；卡兹克仅本人身份明确的公开微博/即刻/可读公众号，不使用无授权转载冒充本人；AGIHunt仅agihunt.info自身可读文章，外链需独立命中白名单。Hugging Face需核对官方或研究作者身份，arXiv限定AI相关论文。保留核查证据；域名验证只是第一道门槛，不能替代栏目/作者核查。
5. 同一事件跨媒体、跨平台、跨板块合并，每日只占一个名额；明确发生重要新进展可在次日重新报道并讲清变化。每板块目标10条；充分检索仍不能核实则注明实际条数和缺额，不拿旧闻或猜测凑数。简讯不强行扩成500字；资料充足时中文约500—900字。控制每篇原文累计转述量与引用量，不因拆成多条绕过来源字数限制。
6. JSON符合 `lib/types.ts` Article；id为稳定ASCII小写数字连字符，格式如 politics-20260911-01，一经发布不变；eventKey表达事件身份，rank在本板块1—10且无重复；sources含sourceId、name、永久url、带时区publishedAt、readAt；timeline的sourceUrl必须出现在sources。只有日期的原文不能证明其于当天截稿前公开时，应归入下一期。checkedAt记录实际核查时间。
7. 09:00初稿保存 `.local/drafts/YYYY-MM-DD.preliminary.json`；09:30再检索重大更新，筛除晚于09:30的报道，完整核查后保存 `.local/drafts/YYYY-MM-DD.json`。当日稿retrospective=false；补录稿true且内容仅使用当时截稿前可得信息，标注“历史回溯整理”。未经最终核查不要调用upload。
8. 运行 `node --experimental-strip-types scripts/validate-file.ts .local/drafts/YYYY-MM-DD.json`。通过后 `python -X utf8 scripts/briefing.py upload --file .local/drafts/YYYY-MM-DD.json`。网站草稿未发布前不对公众可见。
9. 10:00任务调用 `python -X utf8 scripts/briefing.py deliver --date YYYY-MM-DD`，先发布网站再读取同一期生成邮件。draft缺失/验证失败则延迟，不能自行发布初稿。网站接口最多3次重试；已经发布/已发邮件会去重。邮件明确连接失败可在总尝试数不超过3的前提下重试；sending/unknown必须核查，禁止自动改状态重发。
10. 更正走 `PATCH /api/internal/news/[id]`，发送 `{article, reason}`，保持永久ID与原编排；系统保存旧版本和更正说明。任何更正不得把晚于历史截稿的消息冒充当时已知事实。

## 重大新闻漏选检查（2026-09-10用户纠正后强制执行）

- 先发现候选，再排名，最后写稿。禁止先抓到十篇就停止检索。每期保存 `.local/drafts/YYYY-MM-DD.review.json`，记录各来源检查状态、候选事件、重要性等级、入选/合并/排除理由及原文链接。
- AI优先覆盖OpenAI、Anthropic、DeepMind、DeepSeek、Qwen、英伟达的官方研究及发布入口，再扫描机器之心、量子位、APPSO、数字生命卡兹克、AGI Hunt。遇到不可读来源记录原因，不能默默当作“没有新闻”。arXiv用于核实和补充，不能用常规论文填满栏目后遗漏官方重大消息。
- 第一优先级：重大科学突破或其可信的正式声明（例如OpenAI于9月8日公布N-S方程证明）、旗舰模型发布、重大安全事故、影响广泛的监管或行业事件。第二优先级：有显著影响的产品、算力、融资与应用进展。一般论文、营销活动和小幅功能更新靠后。
- 同级候选再按影响范围、独立来源关注度和新进展时效排序；转发数量不等于独立来源。每个未入选的已核实重大事件必须重新审阅，通常应替换低优先级条目。若重大事件超过十个，应明确记录取舍，不能笼统写“名额不足”。
- 09:30终审前再逐个扫描上述官方入口及专业媒体头条，与30条最终稿对照，保存漏选复查结果。检查“有重大消息却全是一般论文”的情况。正文的事实核实与事件重要性是两个独立检查，来源真实并不代表选题重要。
- 区分“发布方声明/提出证明”“独立复核”“学界接受/奖项认定”；重大而未获最终确认的声明仍应报道，准确注明阶段，不能因未定论完全漏选，也不能写成已有最终认证。
- 发现已出版晨报重大漏选，用 `POST /api/internal/editions/[date]/reselect` 提交 `{article,replacedId,reason}`。核实补录消息在当期截稿前已公开。新文章进入栏目首条，被替换文章退出当期精选但继续出现在历史搜索和原永久链接中，保留说明与修改时间；整期仍为每栏最多10条。不要将另一事件覆盖到旧文章ID上，不自动重发历史邮件。

## 本机设置与验收

- `python scripts/credentials.py mail` 隐藏输入QQ SMTP授权码，Windows DPAPI按当前用户加密保存 `.local/qq.dpapi`，不进入Git或网站。QQ设置中需开启SMTP，使用授权码而非QQ密码；不在聊天中提供授权码。
- `python -X utf8 scripts/briefing.py preview --date YYYY-MM-DD` 输出 `.local/mail-preview.html`。
- `python -X utf8 scripts/briefing.py send --date YYYY-MM-DD --test` 发一封测试晨报。测试与每日正式邮件各有独立去重键。
- 用户已核对测试邮件正常。因同一任务只能启用一个 heartbeat，三个阶段合并到原生调度 09-00（“十点晨报 · 每日采集与发布”），每天北京时间09:00、09:30、10:00运行；旧09-30、10-00保持暂停，避免重复。若授权码失效则记录失败并提示用户，不声称邮件已送达。
- `.local/delivery.sqlite`记录保存、发布与邮件的状态；保留此文件以防重复投递。不得删除状态库来强制重发。
- 发布密钥为 `.local/ingest.dpapi`，云端为Sites秘密变量INGEST_SECRET。不要打印、写入源码、日志或发给其他服务；更换电脑需重新配置信息。

## 网站接口

- GET /api/editions?list=1：已发布日期；GET /api/editions?date=YYYY-MM-DD：一期完整内容。
- GET /api/news?q=关键词&from=YYYY-MM-DD&to=YYYY-MM-DD&category=ai&page=1：中文关键词AND匹配、日期闭区间、每页30条；省略条件即全部。
- GET /api/news/[id]：永久详情；未发布或不存在返回404。
- 内部GET/PUT /api/internal/editions/[date]；POST /api/internal/editions/[date]/publish；PATCH /api/internal/news/[id]，均需Bearer发布密钥。
- 生产数据来自D1，不依赖浏览器缓存；建表迁移与新闻写入分开，不把新闻数据写入部署迁移。

## 验证命令

`npx tsc --noEmit`、`node --experimental-strip-types --test tests/domain.test.ts`、`python -X utf8 -m unittest discover -s tests -p '*_test.py'`，再运行Sites构建。Windows当前平台构建助手的npm解析有误时，直接运行项目同一 `npm run build`；不要修改全局npm。

凭据及投递命令必须以当前 Windows 桌面用户运行。Codex 若使用隔离账户，请以 require_escalated 运行这些已获授权的本机命令；DPAPI不能跨用户解密，不能因解密失败改为明文存储。
