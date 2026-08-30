export function createInstall(container, { ui }) {
  container.innerHTML = `
    ${ui.header('Home screen')}
    <div class="panel">
      <h2>Save it like an app</h2>
      <p>Add Sparkbox to your home screen so you can open it without hunting through the browser.</p>
    </div>
    <div class="panel">
      <h2>iPhone &amp; iPad</h2>
      <ol class="install-list">
        <li>Open this site in <strong>Safari</strong></li>
        <li>Tap the <strong>Share</strong> button (the square with the arrow)</li>
        <li>Scroll and tap <strong>Add to Home Screen</strong></li>
        <li>Tap <strong>Add</strong></li>
      </ol>
    </div>
    <div class="panel">
      <h2>Android</h2>
      <ol class="install-list">
        <li>Open this site in <strong>Chrome</strong></li>
        <li>Tap the <strong>⋮</strong> menu</li>
        <li>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong></li>
        <li>Tap <strong>Add</strong> or <strong>Install</strong></li>
      </ol>
    </div>
    <div class="panel">
      <h2>iOS app</h2>
      <p>A native iPhone app is coming soon. Until then, Add to Home Screen is the closest thing — it opens full screen like an app.</p>
      <p class="install-soon">iOS app coming soon</p>
    </div>
  `;
}
