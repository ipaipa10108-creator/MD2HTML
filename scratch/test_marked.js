import { marked } from 'marked';

marked.use({
  renderer: {
    code({ text, lang, escaped }) {
      const language = lang || '';
      return `<div class="code-block-wrapper" style="position: relative;">
  <button class="copy-code-btn" style="position: absolute; top: 8px; right: 8px;">Copy</button>
  <pre><code class="language-${language}">${text}</code></pre>
</div>`;
    }
  }
});

const html = marked.parse('```js\nconsole.log("hello");\n```');
console.log(html);
