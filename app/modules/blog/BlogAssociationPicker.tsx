import { useState } from "react";

export interface AssociationChoice {
  id: string;
  title: string;
  detail?: string;
  thumbnail?: string;
}
export function BlogAssociationPicker({ label, items, selected, onToggle, onInsert }: {
  label: string;
  items: AssociationChoice[];
  selected: string[];
  onToggle(id: string): void;
  onInsert?(id: string): void;
}) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase();
  const visible = items.filter(item => [item.title, item.detail, item.id].some(text => text?.toLocaleLowerCase().includes(query)));
  const selectedIds = new Set(selected);
  const labels = new Map(items.map(item => [item.id, item.title]));
  return <details className="blog-picker">
    <summary>{label} <span>{selected.length ? "· " + selected.length : ""}</span></summary>
    {selected.length > 0 && <ul className="blog-picker__selection">
      {selected.map(id => <li key={id}><button type="button" aria-label={"取消关联 " + (labels.get(id) || id)} onClick={() => onToggle(id)}>{labels.get(id) || id} ×</button></li>)}
    </ul>}
    <label>搜索{label}<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label>
    {visible.length ? <ul className="blog-picker__list">
      {visible.slice(0, 50).map(item => <li key={item.id}>
        <label className="blog-checkbox">
          <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => onToggle(item.id)} />
          {item.thumbnail && <img src={item.thumbnail} width="42" height="42" alt="" loading="lazy" />}
          <span>{item.title}{item.detail && <small>{item.detail}</small>}</span>
        </label>
        {onInsert && <button type="button" aria-label={"插入正文 " + item.title} onClick={() => onInsert(item.id)}>插入正文</button>}
      </li>)}
    </ul> : <p className="blog-admin-note">{query ? "没有符合条件的结果。" : "暂无可选内容。"}</p>}
    {visible.length > 50 && <small>已显示 50 项，可搜索定位更多内容。</small>}
  </details>;
}
