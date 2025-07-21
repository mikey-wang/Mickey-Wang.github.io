const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'api', 'cG9zdC');
const outDir = path.join(__dirname, 'postMD');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

function htmlEntitiesDecode(str) {
  return str.replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”');
}

function stripTags(str) {
  return str.replace(/<[^>]*>/g, '');
}

function convert(html) {
  let text = html;

  text = text.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_m, code) => {
    return '\n```\n' + htmlEntitiesDecode(code.trim()) + '\n```\n';
  });
  text = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_m, code) => {
    return '\n```\n' + htmlEntitiesDecode(stripTags(code.trim())) + '\n```\n';
  });

  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_m, code) => {
    return '`' + htmlEntitiesDecode(code.trim()) + '`';
  });

  text = text.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, level, content) => {
    return '\n' + '#'.repeat(parseInt(level,10)) + ' ' + htmlEntitiesDecode(stripTags(content.trim())) + '\n\n';
  });

  text = text.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]+)"[^>]*>/gi, (_m, alt, src) => {
    return '![' + alt + '](' + src + ')';
  });
  text = text.replace(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi, (_m, src, alt) => {
    return '![' + alt + '](' + src + ')';
  });
  text = text.replace(/<img[^>]*src="([^"]+)"[^>]*>/gi, (_m, src) => {
    return '![](' + src + ')';
  });

  text = text.replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, content) => {
    return '[' + htmlEntitiesDecode(stripTags(content.trim())) + '](' + href + ')';
  });

  text = text.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_m, inner) => {
    return '\n' + inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m2, item) => '- ' + htmlEntitiesDecode(stripTags(item.trim())) + '\n') + '\n';
  });
  text = text.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_m, inner) => {
    let i = 0;
    return '\n' + inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m2, item) => {
      i++; return i + '. ' + htmlEntitiesDecode(stripTags(item.trim())) + '\n';
    }) + '\n';
  });

  text = text.replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, (_m, inner) => {
    const lines = htmlEntitiesDecode(stripTags(inner.trim())).split(/\n+/).map(l => '> ' + l);
    return '\n' + lines.join('\n') + '\n';
  });

  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, para) => {
    return htmlEntitiesDecode(stripTags(para.trim())) + '\n\n';
  });

  text = text.replace(/<br\s*\/?>/gi, '\n');

  text = stripTags(text);
  text = htmlEntitiesDecode(text);
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim() + '\n';
}

function walk(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) results = results.concat(walk(full));
    else if (entry.endsWith('.json')) results.push(full);
  }
  return results;
}

function run() {
  for (const file of walk(apiDir)) {
    const raw = fs.readFileSync(file, 'utf-8');
    let data;
    try { data = JSON.parse(raw); } catch { continue; }
    if (!data || typeof data !== 'object') continue;
    const slug = (data.slug || data.title || path.basename(file, '.json')).replace(/[\/\\]/g, '-');
    const mdPath = path.join(outDir, slug + '.md');
    let md = '---\n';
    md += 'title: ' + (data.title || slug) + '\n';
    if (data.date) md += 'date: ' + data.date + '\n';
    if (Array.isArray(data.categories) && data.categories.length) {
      md += 'categories:\n';
      for (const c of data.categories) md += '  - ' + c + '\n';
    }
    if (Array.isArray(data.tags) && data.tags.length) {
      md += 'tags:\n';
      for (const t of data.tags) md += '  - ' + t + '\n';
    }
    md += '---\n\n';
    md += convert(data.content || '');
    fs.writeFileSync(mdPath, md, 'utf-8');
  }
}

if (require.main === module) {
  run();
}

module.exports = { convert };
