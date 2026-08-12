// render.js
// Converts the Notion block tree returned by our /api/notion/page endpoint
// into HTML, following the block type reference (headings, lists, callouts,
// code, media, tables, columns, tabs, mentions, equations, etc).

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const fileIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide-file" style="vertical-align:middle;display:inline-block;width:20px;height:20px;"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`;
const databaseIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide-database" style="vertical-align:middle;display:inline-block;width:20px;height:20px;"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>`;
const templateIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide-play-circle" style="vertical-align:middle;display:inline-block;width:20px;height:20px;"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`;
const micIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide-mic" style="vertical-align:middle;display:inline-block;width:20px;height:20px;"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`;
const pdfIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide-file-text" style="vertical-align:middle;display:inline-block;width:20px;height:20px;"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`;
const paperclipIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide-paperclip" style="vertical-align:middle;display:inline-block;width:20px;height:20px;"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`;
const linkIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide-link" style="vertical-align:middle;display:inline-block;width:20px;height:20px;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
const lightbulbIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide-lightbulb" style="vertical-align:middle;display:inline-block;width:20px;height:20px;"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`;

export function emojiOrFileIcon(icon) {
  if (!icon) return '';
  if (icon.type === 'emoji') return escapeHtml(icon.emoji);
  const url = icon.file?.url || icon.external?.url;
  return url ? `<img src="${escapeHtml(url)}" alt="" style="width:1.1em;height:1.1em;vertical-align:-0.15em;border-radius:3px;">` : '';
}

// ---- Rich text (inline) rendering -----------------------------------------

function renderRichText(richTextArr) {
  if (!richTextArr || richTextArr.length === 0) return '';
  return richTextArr.map(renderRichTextItem).join('');
}

function renderRichTextItem(rt) {
  if (rt.type === 'equation') {
    const expr = rt.equation?.expression || '';
    try {
      if (window.katex) {
        return `<span class="rt-equation">${katex.renderToString(expr, { throwOnError: false })}</span>`;
      }
    } catch (e) {
      /* fall through */
    }
    return `<code class="rt-code">${escapeHtml(expr)}</code>`;
  }

  if (rt.type === 'mention') {
    const label = escapeHtml(rt.plain_text || '');
    let icon = '📄';
    const m = rt.mention || {};
    if (m.type === 'user') icon = '@';
    else if (m.type === 'date') icon = '📅';
    else if (m.type === 'page') icon = '📄';
    else if (m.type === 'database') icon = '🗄️';
    else if (m.type === 'link_preview') icon = '🔗';
    return `<span class="rt-mention">${icon} ${label}</span>`;
  }

  // type === 'text'
  let html = escapeHtml(rt.plain_text ?? rt.text?.content ?? '');
  const a = rt.annotations || {};

  if (a.code) html = `<code class="rt-code">${html}</code>`;
  if (a.bold) html = `<strong class="rt-bold">${html}</strong>`;
  if (a.italic) html = `<em class="rt-italic">${html}</em>`;
  if (a.strikethrough) html = `<s class="rt-strike">${html}</s>`;
  if (a.underline) html = `<span class="rt-underline">${html}</span>`;

  const href = rt.href || rt.text?.link?.url;
  if (href) html = `<a class="rt-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${html}</a>`;

  const classes = [];
  if (a.color && a.color !== 'default') {
    classes.push(a.color.endsWith('_background') ? `bg-${a.color}` : `color-${a.color}`);
  }
  if (classes.length) html = `<span class="${classes.join(' ')}">${html}</span>`;

  return html;
}

function colorClass(color) {
  if (!color || color === 'default') return '';
  return color.endsWith('_background') ? `bg-${color}` : `color-${color}`;
}

// ---- Lazy-loading helpers ---------------------------------------------------

function pendingChildrenPlaceholder(blockId, opts = {}) {
  const kind = opts.kind || 'eager'; 
  return `<div class="n-children n-lazy" data-lazy-id="${blockId}" data-lazy-kind="${kind}"></div>`;
}

function pendingBlockPlaceholder(blockId, label) {
  return `<div class="n-block-placeholder n-lazy" data-lazy-id="${blockId}" data-lazy-kind="eager" data-lazy-root="1" aria-label="${escapeHtml(label)}"></div>`;
}

function childrenHtml(b, kind = 'eager') {
  if (b._children) return b._children.length ? `<div class="n-children">${renderChildren(b._children)}</div>` : '';
  if (b.has_children) return pendingChildrenPlaceholder(b.id, { kind });
  return '';
}

// ---- Children rendering ----------------------------------------------------

export function renderChildren(blocks) {
  if (!blocks || blocks.length === 0) return '';
  const html = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];

    if (b.type === 'bulleted_list_item') {
      const group = [];
      while (i < blocks.length && blocks[i].type === 'bulleted_list_item') {
        group.push(blocks[i]);
        i++;
      }
      html.push(`<ul class="n-list-ul">${group.map(renderListItem).join('')}</ul>`);
      continue;
    }

    if (b.type === 'numbered_list_item') {
      const group = [];
      while (i < blocks.length && blocks[i].type === 'numbered_list_item') {
        group.push(blocks[i]);
        i++;
      }
      const first = group[0].numbered_list_item || {};
      const startAttr = first.list_start_index ? ` start="${first.list_start_index}"` : '';
      const typeAttr = { letters: ' type="a"', roman: ' type="i"' }[first.list_format] || '';
      html.push(`<ol class="n-list-ol"${startAttr}${typeAttr}>${group.map(renderListItem).join('')}</ol>`);
      continue;
    }

    html.push(renderBlock(b));
    i++;
  }
  return html.join('');
}

function renderListItem(b) {
  const data = b.bulleted_list_item || b.numbered_list_item || {};
  return `<li class="${colorClass(data.color)}">${renderRichText(data.rich_text)}${childrenHtml(b)}</li>`;
}

// PORTATO A 15px
function renderSelectTag(name) {
  if (!name) return '';
  const colors = [
    { bg: '#F1F1F0', fg: '#5F5E5B' },
    { bg: '#E2F6EA', fg: '#23A15F' },
    { bg: '#E8F0FE', fg: '#1A73E8' },
    { bg: '#FDEFD2', fg: '#D9730D' },
    { bg: '#FCE4EC', fg: '#C2185B' },
    { bg: '#F3E5F5', fg: '#7B1FA2' },
    { bg: '#E0F7FA', fg: '#0097A7' },
    { bg: '#FFFDE7', fg: '#FBC02D' },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = colors[Math.abs(hash) % colors.length];
  return `<span class="db-select-tag" style="background:${color.bg};color:${color.fg};padding:4px 10px;border-radius:4px;font-size:15px;font-weight:500;white-space:nowrap;display:inline-block;">${escapeHtml(name)}</span>`;
}

function renderStatusTag(statusObj) {
  if (!statusObj) return '';
  const name = statusObj.name || '';
  let bg = '#F1F1F0', fg = '#5F5E5B', dotColor = '#9A9996';
  const lower = name.toLowerCase();

  if (lower.includes('done') || lower.includes('completato') || lower.includes('finito')) {
    bg = '#E2F6EA'; fg = '#23A15F'; dotColor = '#23A15F';
  } else if (lower.includes('progress') || lower.includes('corso') || lower.includes('svolgimento')) {
    bg = '#FDEFD2'; fg = '#D9730D'; dotColor = '#D9730D';
  } else if (lower.includes('not started') || lower.includes('inizio') || lower.includes('da fare')) {
    bg = '#EEEEEE'; fg = '#5A5A57'; dotColor = '#9A9996';
  }

  return `<span class="db-status-tag" style="background:${bg};color:${fg};padding:3px 10px;border-radius:12px;font-size:15px;font-weight:500;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;"><span style="width:6px;height:6px;border-radius:50%;background:${dotColor};display:inline-block;"></span>${escapeHtml(name)}</span>`;
}

// "PICCOLO SE PROPRIO NECESSARIO": tenuto a 13px le finte icone testuali per evitare confusione visiva
function getPropIconSvg(type) {
  if (type === 'title' || type === 'rich_text') {
    return `<span style="font-family:monospace;font-weight:bold;font-size:13px;color:#9A9996;margin-right:4px;">Aa</span>`;
  }
  if (type === 'number') {
    return `<span style="font-family:monospace;font-weight:bold;font-size:13px;color:#9A9996;margin-right:4px;">#</span>`;
  }
  if (type === 'select' || type === 'multi_select') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9A9996" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon" style="margin-right:4px;vertical-align:middle;display:inline-block;width:14px;height:14px;"><path d="M12 2H2v10h10V2z"/><path d="m20 12-8 8-4-4"/></svg>`;
  }
  if (type === 'date') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9A9996" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon" style="margin-right:4px;vertical-align:middle;display:inline-block;width:14px;height:14px;"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`;
  }
  if (type === 'status') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9A9996" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon" style="margin-right:4px;vertical-align:middle;display:inline-block;width:14px;height:14px;"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9A9996" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon" style="margin-right:4px;vertical-align:middle;display:inline-block;width:14px;height:14px;"><circle cx="12" cy="12" r="10"/></svg>`;
}

export function renderDatabase(db, pages, viewConfig) {
  const properties = db.properties || {};
  let propKeys = Object.keys(properties);

  if (viewConfig && viewConfig.configuration && Array.isArray(viewConfig.configuration.properties)) {
    const viewProps = viewConfig.configuration.properties;
    const idToName = {};
    for (const key in properties) {
      if (properties[key] && properties[key].id) {
        idToName[properties[key].id] = key;
      }
    }
    const orderedKeys = [];
    viewProps.forEach(vp => {
      const name = idToName[vp.property_id] || (properties[vp.property_id] ? vp.property_id : null);
      if (name && vp.visible !== false) {
        orderedKeys.push(name);
      }
    });
    if (orderedKeys.length > 0) {
      propKeys = orderedKeys;
    }
  }

  const titleIndex = propKeys.findIndex(key => properties[key]?.type === 'title');
  if (titleIndex > -1) {
    const [titleKey] = propKeys.splice(titleIndex, 1);
    propKeys.unshift(titleKey);
  }

  // PORTATO A 15px
  const headerCols = propKeys.map(key => {
    const propType = properties[key]?.type || 'rich_text';
    return `<th style="background:#FFFFFF;color:#7c7b77;padding:10px 12px;border-bottom:1px solid rgba(55,53,47,0.09);text-align:left;font-size:15px;font-weight:500;"><span style="display:inline-flex;align-items:center;">${getPropIconSvg(propType)}${escapeHtml(key)}</span></th>`;
  }).join('');

  const rowsHtml = pages.slice().reverse().map(page => {
    const pageProps = page.properties || {};
    const cells = propKeys.map(key => {
      const propId = properties[key]?.id || key;
      const val = pageProps[key] !== undefined ? pageProps[key] : pageProps[propId];
      let text = '';
      if (val) {
        if (val.type === 'title') {
          const titleText = renderRichText(val.title);
          const iconHtml = (page.icon ? emojiOrFileIcon(page.icon) : '') || fileIconSvg;
          text = `<div style="display:flex;align-items:center;gap:8px;font-weight:500;width:100%;">
                    <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;flex-shrink:0;">${iconHtml}</span>
                    <span class="db-title-text">${titleText || 'Senza titolo'}</span>
                    <button class="db-open-btn">OPEN</button>
                  </div>`;
        } else if (val.type === 'rich_text') text = renderRichText(val.rich_text);
        else if (val.type === 'number') text = val.number ?? '';
        else if (val.type === 'select') text = renderSelectTag(val.select?.name);
        else if (val.type === 'multi_select') text = (val.multi_select || []).map(s => renderSelectTag(s.name)).join(' ');
        else if (val.type === 'date') text = val.date?.start || '';
        else if (val.type === 'people') text = (val.people || []).map(p => p.name || '@').join(', ');
        else if (val.type === 'checkbox') text = val.checkbox ? 'Yes' : 'No';
        else if (val.type === 'url') text = val.url || '';
        else if (val.type === 'email') text = val.email || '';
        else if (val.type === 'phone_number') text = val.phone_number || '';
        else if (val.type === 'status') text = renderStatusTag(val.status);
        else if (val.type === 'files') text = (val.files || []).map(f => f.name).join(', ');
        else if (val.type === 'relation') text = (val.relation || []).map(r => r.id).join(', ');
        else if (val.type === 'formula') {
          const form = val.formula || {};
          text = form.string || form.number || form.boolean || form.date?.start || '';
        } else if (val.type === 'rollup') {
          const roll = val.rollup || {};
          if (roll.type === 'number') text = roll.number ?? '';
          else if (roll.type === 'date') text = roll.date?.start || '';
          else if (roll.type === 'array') text = (roll.array || []).map(item => item.name || item.plain_text || '').filter(Boolean).join(', ');
        }
      }
      return `<td style="padding:10px 12px;border-bottom:1px solid rgba(55,53,47,0.08);font-size:15px;color:#37352F;">${text}</td>`;
    }).join('');

    const pageUrl = page.url || (page.id ? `https://notion.so/${page.id.replace(/-/g, '')}` : '');
    return `<tr class="db-row" onclick="if(window.loadNotionPage) window.loadNotionPage('${escapeHtml(pageUrl)}');" style="cursor:pointer;">${cells}</tr>`;
  }).join('');

  return `<div class="n-database-wrap" style="overflow-x:auto;margin:8px 0;"><table class="n-table n-database-table" style="width:100%;border-collapse:collapse;min-width:400px;margin:0;"><thead><tr>${headerCols}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
}

// ---- Individual block dispatch ---------------------------------------------

export function renderBlock(b) {
  const type = b.type;
  const data = b[type] || {};
  const kids = childrenHtml(b);

  switch (type) {
    case 'paragraph': {
      const icon = data.icon ? `${emojiOrFileIcon(data.icon)} ` : '';
      return `<p class="n-paragraph ${colorClass(data.color)}">${icon}${renderRichText(data.rich_text)}</p>${kids}`;
    }
    case 'heading_1':
    case 'heading_2':
    case 'heading_3':
    case 'heading_4': {
      const level = type.split('_')[1];
      const cls = `n-h${level} ${colorClass(data.color)}`;
      if (data.is_toggleable) {
        return `<details class="n-toggle-heading"><summary><h${level} class="${cls}" style="display:inline">${renderRichText(data.rich_text)}</h${level}></summary>${childrenHtml(b, 'toggle')}</details>`;
      }
      return `<h${level} class="${cls}">${renderRichText(data.rich_text)}</h${level}>`;
    }
    case 'to_do': {
      const checkedCls = data.checked ? ' checked' : '';
      return `<div class="n-todo${checkedCls} ${colorClass(data.color)}"><input type="checkbox" disabled ${data.checked ? 'checked' : ''}><span class="n-todo-text">${renderRichText(data.rich_text)}</span></div>${kids}`;
    }
    case 'toggle': {
      return `<details class="n-toggle"><summary>${renderRichText(data.rich_text)}</summary>${childrenHtml(b, 'toggle')}</details>`;
    }
    case 'quote': {
      return `<blockquote class="n-quote ${colorClass(data.color)}">${renderRichText(data.rich_text)}${kids}</blockquote>`;
    }
    case 'callout': {
      const icon = emojiOrFileIcon(data.icon) || lightbulbIconSvg;
      return `<div class="n-callout ${colorClass(data.color)}"><div class="n-callout-icon">${icon}</div><div class="n-callout-body">${renderRichText(data.rich_text)}${kids}</div></div>`;
    }
    case 'divider':
      return `<hr class="n-divider">`;
    case 'code': {
      const lang = data.language || 'plain text';
      const caption = data.caption?.length ? `<div class="n-code-caption">${renderRichText(data.caption)}</div>` : '';
      const codeText = (data.rich_text || []).map(r => r.plain_text).join('');
      return `<div class="n-code-wrap">${caption}<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(codeText)}</code></pre></div>`;
    }
    case 'image':
    case 'video':
    case 'audio': {
      const url = data.type === 'external' ? data.external?.url : data.file?.url;
      const caption = data.caption?.length ? `<div class="n-caption">${renderRichText(data.caption)}</div>` : '';
      let mediaHtml;
      if (type === 'image') {
        mediaHtml = `<img src="${escapeHtml(url || '')}" alt="">`;
      } else if (type === 'video') {
        const yt = url && /youtube\.com|youtu\.be/.test(url);
        mediaHtml = yt ? `<iframe src="${escapeHtml(toYouTubeEmbed(url))}" allowfullscreen></iframe>` : `<video src="${escapeHtml(url || '')}" controls></video>`;
      } else {
        mediaHtml = `<audio src="${escapeHtml(url || '')}" controls style="width:100%"></audio>`;
      }
      return `<figure class="n-media-figure">${mediaHtml}${caption}</figure>`;
    }
    case 'file':
    case 'pdf': {
      const url = data.type === 'external' ? data.external?.url : data.file?.url;
      const name = data.name || (type === 'pdf' ? 'PDF' : 'File allegato');
      const caption = data.caption?.length ? `<div class="n-caption">${renderRichText(data.caption)}</div>` : '';
      return `<a class="n-file-card" href="${escapeHtml(url || '#')}" target="_blank" rel="noopener noreferrer"><span class="n-card-icon">${type === 'pdf' ? pdfIconSvg : paperclipIconSvg}</span><span class="n-card-body"><span class="n-card-title">${escapeHtml(name)}</span><span class="n-card-sub">${escapeHtml(url || '')}</span></span></a>${caption}`;
    }
    case 'bookmark':
    case 'link_preview': {
      const url = data.url || '';
      const caption = data.caption?.length ? `<div class="n-caption">${renderRichText(data.caption)}</div>` : '';
      return `<a class="n-bookmark-card" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><span class="n-card-icon">${linkIconSvg}</span><span class="n-card-body"><span class="n-card-title">${escapeHtml(url)}</span></span></a>${caption}`;
    }
    case 'embed': {
      const url = data.url || '';
      const caption = data.caption?.length ? `<div class="n-caption">${renderRichText(data.caption)}</div>` : '';
      return `<figure class="n-media-figure"><iframe src="${escapeHtml(url)}"></iframe>${caption}</figure>`;
    }
    case 'equation': {
      const expr = data.expression || '';
      let inner;
      try {
        inner = window.katex ? katex.renderToString(expr, { throwOnError: false, displayMode: true }) : escapeHtml(expr);
      } catch (e) {
        inner = escapeHtml(expr);
      }
      return `<div class="n-equation-block">${inner}</div>`;
    }
    case 'table': {
      if (!b._children) return pendingBlockPlaceholder(b.id, 'Tabella');
      const rows = b._children || [];
      const rowsHtml = rows.map((row, ri) => {
        const cells = (row.table_row?.cells || []).map((cellRich, ci) => {
          const classes = [];
          if (ri === 0 && data.has_column_header) classes.push('n-th-col-header');
          if (ci === 0 && data.has_row_header) classes.push('n-th-row-header');
          return `<td class="${classes.join(' ')}">${renderRichText(cellRich)}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table class="n-table"><tbody>${rowsHtml}</tbody></table>`;
    }
    case 'column_list': {
      if (!b._children) return pendingBlockPlaceholder(b.id, 'Colonne');
      const cols = (b._children || []).map(col => `<div class="n-column" style="flex:${col.column?.width_ratio ? col.column.width_ratio : 1}">${renderChildren(col._children)}</div>`).join('');
      return `<div class="n-columns">${cols}</div>`;
    }
    case 'table_of_contents': {
      return `<div class="n-toc ${colorClass(data.color)}"><em class="muted">Sommario (generato automaticamente da Notion)</em></div>`;
    }
    case 'child_page':
      return `<div class="n-childpage-card"><span class="n-card-icon">${fileIconSvg}</span><span class="n-card-body"><span class="n-card-title">${escapeHtml(data.title || 'Sotto-pagina')}</span><span class="n-card-sub">pagina figlia — apri in Notion per i dettagli</span></span></div>`;
    case 'child_database': {
      if (b._database && b._pages) {
        // PORTATI A 15px tutti i controlli della header
        const dbHeaderBar = `
          <div class="db-header-bar" style="display:flex;align-items:center;justify-content:space-between;margin-top:16px;margin-bottom:8px;">
            <span class="db-header-title" style="font-size:15px;font-weight:600;color:#37352F;">${escapeHtml(data.title || 'Database')}</span>
            <div class="db-header-actions" style="display:flex;align-items:center;gap:12px;color:#7c7b77;font-size:15px;">
              <span style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-size:15px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> Filter</span>
              <span style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-size:15px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="M21 8H11"/><path d="M21 12H11"/><path d="M18 16H11"/></svg> Sort</span>
              <span style="cursor:pointer;display:inline-flex;align-items:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg></span>
              <span style="cursor:pointer;display:inline-flex;align-items:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/></svg></span>
              <span style="cursor:pointer;display:inline-flex;align-items:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></span>
              <button style="background:#1A73E8;color:#FFFFFF;border:none;border-radius:4px;padding:6px 10px;font-size:15px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">New <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon"><path d="M5 12h14M12 5v14"/></svg></button>
            </div>
          </div>
        `;
        return `<div class="n-child-database-container" style="margin:12px 0;">${dbHeaderBar}${renderDatabase(b._database, b._pages)}</div>`;
      }
      return `<div class="n-childpage-card"><span class="n-card-icon">${databaseIconSvg}</span><span class="n-card-body"><span class="n-card-title">${escapeHtml(data.title || 'Database')}</span><span class="n-card-sub">database figlio — apri in Notion per i dettagli</span></span></div>`;
    }
    case 'synced_block':
      if (!b._children) return pendingBlockPlaceholder(b.id, 'Blocco sincronizzato');
      return `<div class="n-synced">${renderChildren(b._children)}</div>`;
    case 'template':
      return `<div class="n-callout"><div class="n-callout-icon">${templateIconSvg}</div><div>${renderRichText(data.rich_text)} <span class="muted">(pulsante template — deprecato nell'API)</span></div></div>`;
    case 'breadcrumb':
      return `<div class="n-breadcrumb">Home / …</div>`;
    case 'tab': {
      if (!b._children) return pendingBlockPlaceholder(b.id, 'Tab');
      const panels = b._children || [];
      const tabButtons = panels.map((p, idx) => {
        const rt = p.paragraph?.rich_text || [];
        const icon = p.paragraph?.icon ? emojiOrFileIcon(p.paragraph.icon) : '';
        return `<button class="n-tab-btn${idx === 0 ? ' active' : ''}" data-tab-idx="${idx}">${icon} ${renderRichText(rt) || `Tab ${idx + 1}`}</button>`;
      }).join('');
      const tabPanels = panels.map((p, idx) => {
        return `<div class="n-tab-panel${idx === 0 ? ' active' : ''}" data-tab-panel="${idx}">${renderChildren(p._children)}</div>`;
      }).join('');
      return `<div class="n-tabs"><div class="n-tabs-list">${tabButtons}</div>${tabPanels}</div>`;
    }
    case 'meeting_notes':
    case 'transcription': {
      const info = data;
      const statusLabel = (info.status || '').replace(/_/g, ' ');
      return `<div class="n-meeting-card"><div class="n-meeting-title">${micIconSvg} ${renderRichText(info.title) || 'Meeting notes'}</div><span class="n-meeting-status">${escapeHtml(statusLabel)}</span></div>`;
    }
    case 'unsupported':
      return `<div class="n-unsupported">Blocco non supportato dall'API (${escapeHtml(data.block_type || 'sconosciuto')})</div>`;
    default:
      return `<div class="n-unsupported">Tipo di blocco sconosciuto: ${escapeHtml(type)}</div>`;
  }
}

function toYouTubeEmbed(url) {
  try {
    const u = new URL(url);
    let id = null;
    if (u.hostname.includes('youtu.be')) id = u.pathname.slice(1);
    else if (u.searchParams.get('v')) id = u.searchParams.get('v');
    else if (u.pathname.includes('/embed/')) return url;
    return id ? `https://www.youtube.com/embed/${id}` : url;
  } catch (e) {
    return url;
  }
}

export function wireUpTabs(root) {
  const tabGroups = root.matches?.('.n-tabs') ? [root, ...root.querySelectorAll('.n-tabs')] : [...root.querySelectorAll('.n-tabs')];
  tabGroups.forEach(tabs => {
    if (tabs.dataset.tabsWired) return;
    tabs.dataset.tabsWired = '1';
    tabs.querySelectorAll('.n-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.dataset.tabIdx;
        tabs.querySelectorAll('.n-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        tabs.querySelectorAll('.n-tab-panel').forEach(p => p.classList.toggle('active', p.dataset.tabPanel === idx));
      });
    });
  });
}

// ---- Page-level rendering --------------------------------------------------

export function renderPage(page, blocks) {
  let title = '';
  if (page.object === 'database') {
    title = (page.title || []).map(t => t.plain_text).join('');
  } else {
    const props = page.properties || {};
    for (const key in props) {
      if (props[key]?.type === 'title') {
        const titleArr = props[key].title;
        if (Array.isArray(titleArr)) {
          title = titleArr.map(t => t.plain_text).join('');
        }
        break;
      }
    }
  }

  const cover = page.cover ? (page.cover.type === 'external' ? page.cover.external.url : page.cover.file.url) : null;
  const icon = page.icon ? emojiOrFileIcon(page.icon) : '';

  const coverHtml = cover ? `<img class="page-cover" src="${escapeHtml(cover)}" alt="">` : '';
  const iconHtml = icon ? `<div class="page-icon">${icon}</div>` : '';

  return `${coverHtml}${iconHtml}<h1 class="page-title">${escapeHtml(title || 'Senza titolo')}</h1>${renderChildren(blocks)}`;
}