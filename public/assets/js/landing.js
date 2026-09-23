function ls() {
  var aio_s = document.createElement('script');
  aio_s.src = 'https://widgets.aiocom.io/iframeInjector.js?v=' + new Date().getTime();
  aio_s.setAttribute('data-workspace', 716);
  aio_s.id='aiocom-script';
  aio_s.async=true;
  document.body.appendChild(aio_s);
}
ls();

(function() {
  'use strict';
  const elements = {
    brand: document.getElementById('brandName'),
    heroTitle: document.getElementById('heroTitle'),
    heroDesc: document.getElementById('heroDesc'),
    heroCta: document.getElementById('heroCta'),
    ctaNav: document.getElementById('ctaNav'),
    featuresTitle: document.getElementById('featuresTitle'),
    feat1Title: document.getElementById('feat1Title'),
    feat1Desc: document.getElementById('feat1Desc'),
    feat2Title: document.getElementById('feat2Title'),
    feat2Desc: document.getElementById('feat2Desc'),
    feat3Title: document.getElementById('feat3Title'),
    feat3Desc: document.getElementById('feat3Desc'),
    ctaTitle: document.getElementById('ctaTitle'),
    ctaDesc: document.getElementById('ctaDesc'),
    ctaBottom: document.getElementById('ctaBottom'),
    footerText: document.getElementById('footerText'),
  };
  let translations = null;
  let currentLang = 'fa';
  function setLanguage(lang) {
    if (!translations) return;      
    const t = translations[lang];
    if (!t) return;
    elements.brand.textContent = t.brand;
    elements.heroTitle.textContent = t.heroTitle;
    elements.heroDesc.textContent = t.heroDesc;
    elements.heroCta.textContent = t.heroCta;
    elements.ctaNav.textContent = t.ctaNav;
    elements.featuresTitle.textContent = t.featuresTitle;
    elements.feat1Title.textContent = t.feat1Title;
    elements.feat1Desc.textContent = t.feat1Desc;
    elements.feat2Title.textContent = t.feat2Title;
    elements.feat2Desc.textContent = t.feat2Desc;
    elements.feat3Title.textContent = t.feat3Title;
    elements.feat3Desc.textContent = t.feat3Desc;
    elements.ctaTitle.textContent = t.ctaTitle;
    elements.ctaDesc.textContent = t.ctaDesc;
    elements.ctaBottom.textContent = t.ctaBottom;
    elements.footerText.textContent = t.footer;
    const body = document.body;
    if (lang === 'fa') {
      body.classList.add('rtl');
      document.documentElement.lang = 'fa';
    } else {
      body.classList.remove('rtl');
      document.documentElement.lang = 'en';
    }
    document.querySelectorAll('.lang-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    currentLang = lang;
  }
  function loadTranslations() {
    fetch('./assets/json/landingTexts.json')
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(function(data) {
        translations = data;
        setLanguage('fa');
      })
      .catch(function(error) {
        console.error('Error loading translations:', error);
      });
  }
  document.addEventListener('DOMContentLoaded', function() {
    loadTranslations();
    document.querySelectorAll('.lang-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        var lang = this.dataset.lang;
        if (lang === currentLang) return;
        setLanguage(lang);
      });
    });
  });
})();