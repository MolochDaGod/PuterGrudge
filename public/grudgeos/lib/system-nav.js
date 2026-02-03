/**
 * GrudgeOS System Navigation Bar
 * Injects a consistent nav bar into all gapps
 */

(function() {
  'use strict';
  
  const NAV_HTML = `
    <nav class="gos-system-nav" id="gos-system-nav">
      <div class="gos-nav-left">
        <button class="gos-nav-home" onclick="window.location='/grudgeos/desktop.html'" title="Return to Desktop" data-testid="btn-nav-home">
          <img src="/grudgeos/assets/agents/cloudpilot.png" alt="CloudPilot" onerror="this.style.display='none'">
        </button>
        <span class="gos-nav-title" id="gos-nav-title">CloudPilot</span>
      </div>
      <div class="gos-nav-center">
        <span class="gos-nav-breadcrumb" id="gos-nav-breadcrumb"></span>
      </div>
      <div class="gos-nav-right">
        <div class="gos-nav-status">
          <span class="gos-status-dot" id="gos-status-dot"></span>
          <span id="gos-status-text">Online</span>
        </div>
      </div>
    </nav>
  `;
  
  function injectNav() {
    if (document.getElementById('gos-system-nav')) return;
    
    const navContainer = document.createElement('div');
    navContainer.innerHTML = NAV_HTML.trim();
    document.body.insertBefore(navContainer.firstChild, document.body.firstChild);
    
    document.body.classList.add('gos-has-nav');
    
    const pageTitle = document.title.replace(' - GrudgeOS', '').replace('GrudgeOS ', '');
    const titleEl = document.getElementById('gos-nav-title');
    if (titleEl) titleEl.textContent = pageTitle;
  }
  
  function setNavTitle(title) {
    const titleEl = document.getElementById('gos-nav-title');
    if (titleEl) titleEl.textContent = title;
  }
  
  function setBreadcrumb(text) {
    const breadcrumbEl = document.getElementById('gos-nav-breadcrumb');
    if (breadcrumbEl) breadcrumbEl.textContent = text;
  }
  
  function setStatus(online, text) {
    const dotEl = document.getElementById('gos-status-dot');
    const textEl = document.getElementById('gos-status-text');
    
    if (dotEl) {
      dotEl.classList.toggle('offline', !online);
    }
    if (textEl && text) {
      textEl.textContent = text;
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNav);
  } else {
    injectNav();
  }
  
  window.GOS_Nav = {
    setTitle: setNavTitle,
    setBreadcrumb: setBreadcrumb,
    setStatus: setStatus,
    inject: injectNav
  };
})();
