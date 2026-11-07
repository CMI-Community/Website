import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
} from "react";
import { adminApi, errorMessage } from "./admin-client";
import {
  autofillLabels,
  type AutofillResult,
  type AutofillField,
} from "./event-autofill";

interface Props {
  busy: boolean;
  posterMediaId: string;
  onWorking: (working: boolean) => void;
  upload: (file: File | undefined) => Promise<string | null>;
  apply: (
    result: AutofillResult,
    overwrite: boolean,
  ) => { changed: AutofillField[]; preserved: AutofillField[] };
}
export function EventAutofill({
  busy,
  posterMediaId,
  upload,
  apply,
  onWorking,
}: Props) {
  const [body, setBody] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [configuration, setConfiguration] = useState<{
    configured: boolean;
    provider: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const disabled = busy || working;
  useEffect(() => {
    adminApi<{ configured: boolean; provider: string }>(
      "/api/v1/admin/events/autofill",
    )
      .then(setConfiguration)
      .catch(() => setConfiguration(null));
  }, []);
  async function accept(file: File | undefined) {
    if (!file || disabled || inFlight.current) return;
    setError("");
    setMessage("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("请粘贴或选择 JPG、PNG、WebP 海报。");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("海报大小必须在 10 MB 以内。");
      return;
    }
    inFlight.current = true;
    try {
      const id = await upload(file);
      if (id) setMessage("海报已添加，粘贴正文后即可自动填写。");
      else setError("海报未能上传，请检查图片后重试。");
    } finally {
      inFlight.current = false;
    }
  }
  function paste(e: ClipboardEvent<HTMLDivElement>) {
    const image = [...e.clipboardData.items].find(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
    );
    if (!image) return;
    e.preventDefault();
    void accept(image.getAsFile() ?? undefined);
  }
  function drop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    void accept(e.dataTransfer.files[0]);
  }
  async function extract() {
    if (disabled || !body.trim() || inFlight.current) return;
    inFlight.current = true;
    setWorking(true);
    onWorking(true);
    setError("");
    setMessage("");
    setWarnings([]);
    try {
      const result = await adminApi<AutofillResult>(
        "/api/v1/admin/events/autofill",
        {
          method: "POST",
          body: JSON.stringify({
            body: body.trim(),
            posterMediaId: posterMediaId || null,
          }),
        },
      );
      const applied = apply(result, overwrite);
      setMessage(
        applied.changed.length
          ? `已填入 ${applied.changed.length} 项：${applied.changed.map((key) => autofillLabels[key]).join("、")}。请核对后保存。`
          : "没有需要补填的字段。已填写的内容保留，你可以手动修改。",
      );
      setWarnings([
        ...result.warnings,
        ...(result.missingFields.length
          ? [
              `素材未明确提供：${result.missingFields.map((key) => autofillLabels[key]).join("、")}，请核对、补充。`,
            ]
          : []),
        ...(applied.preserved.length
          ? [
              `保留已填写或受保护的字段：${applied.preserved.map((key) => autofillLabels[key]).join("、")}。`,
            ]
          : []),
      ]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      inFlight.current = false;
      setWorking(false);
      onWorking(false);
    }
  }
  return (
    <section
      className="event-admin__panel event-autofill"
      aria-labelledby="event-autofill-title"
    >
      <div className="event-autofill__heading">
        <div>
          <p className="event-admin__eyebrow">快速填写</p>
          <h2 id="event-autofill-title">海报＋正文自动填写</h2>
        </div>
        <a href="#event-manual-fields">直接手动填写 ↓</a>
      </div>
      <p>
        粘贴海报和你已编辑好的正文，自动梳理下面的字段。填写后仍可手动修改，核对完成再保存或发布。
      </p>
      <div
        className="event-autofill__paste"
        role="group"
        tabIndex={0}
        aria-label="海报粘贴区"
        aria-disabled={disabled}
        onPaste={paste}
        onDragOver={(e) => e.preventDefault()}
        onDrop={drop}
      >
        {posterMediaId && (
          <img
            src={`/api/v1/admin/media/${encodeURIComponent(posterMediaId)}`}
            alt="用于自动填写的海报"
          />
        )}
        <div>
          <strong>
            {posterMediaId ? "海报已添加" : "点击此处，粘贴海报图片"}
          </strong>
          <p>⌘V / Ctrl+V，也可拖入图片。JPG、PNG、WebP，最大 10 MB。</p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            {posterMediaId ? "更换海报" : "选择海报"}
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="自动填写用海报"
          disabled={disabled}
          hidden
          onChange={(e) => {
            void accept(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <label>
        已编辑好的活动正文
        <textarea
          rows={7}
          maxLength={20000}
          value={body}
          disabled={disabled}
          placeholder="在这里粘贴完整活动正文，包括标题、时间、地点、报名方式等。正文会优先于海报；缺少的信息会留空提醒。"
          onChange={(e) => {
            setBody(e.target.value);
            setMessage("");
            setWarnings([]);
          }}
        />
      </label>
      <small>{body.length} / 20000 字</small>
      <label className="event-autofill__checkbox">
        <input
          type="checkbox"
          checked={overwrite}
          disabled={disabled}
          onChange={(e) => setOverwrite(e.target.checked)}
        />
        也更新已经填写的字段
      </label>
      <small>
        默认只补空白项；勾选后会更新已填内容，识别不出的字段仍保留。不会自动保存或发布。
      </small>
      {configuration && (
        <p className="event-admin__note">
          {configuration.configured
            ? `点击后会把这张海报和正文发送给 ${configuration.provider} 识别。`
            : "识别服务尚未配置。你仍可添加素材并直接手动填写。"}
        </p>
      )}
      <button
        type="button"
        className="event-admin__primary"
        disabled={disabled || !body.trim()}
        onClick={() => void extract()}
      >
        {working ? "正在梳理海报和正文…" : "自动填写下面的表单"}
      </button>
      {error && (
        <p className="event-admin__error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="event-admin__success" role="status">
          {message}
        </p>
      )}
      {warnings.length > 0 && (
        <div className="event-admin__notice">
          <strong>请核对</strong>
          <ul>
            {warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
