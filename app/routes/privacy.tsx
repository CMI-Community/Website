export function meta() {
  return [{ title: "隐私说明｜CMI Community" }];
}

export default function Privacy() {
  return (
    <main className="policy-page">
      <p className="system-state__eyebrow">CMI COMMUNITY</p>
      <h1>隐私说明</h1>
      <p>本页是地基版本的最小隐私说明，完整账号与社区功能上线前会继续更新。</p>
      <h2>当前收集</h2>
      <p>海报墙匿名留言使用一个 HttpOnly 随机访客标识，用于识别自己的留言、投票和限制滥用。它不包含姓名或邮箱。</p>
      <h2>受邀账号</h2>
      <p>受邀账号会保存邮箱、验证状态、登录方式、基础资料与权限角色。OAuth 密钥、邮件密钥和部署凭据只保存在 Cloudflare Secret 或 GitHub Environment 中。</p>
      <h2>公开内容</h2>
      <p>公共接口仅提供页面需要的已发布内容。草稿、内部判断、授权状态、本地路径和哈希不会进入公共接口。</p>
      <p><a href="/archive/posters">返回海报档案</a></p>
    </main>
  );
}
