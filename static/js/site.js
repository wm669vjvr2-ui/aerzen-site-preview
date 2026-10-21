/* Small progressive enhancements. All main navigation also works without JS. */
document.querySelectorAll('.header-more,.mobile-menu').forEach(menu=>menu.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.open=false;menu.querySelector('summary').focus();}}));
const dialogs = [...document.querySelectorAll('dialog')];
let previousFocus = null;
function openDialog(dialog) {
  if (!dialog || !('showModal' in dialog)) return;
  previousFocus = document.activeElement;
  dialog.showModal();
  const field = dialog.querySelector('input:not([type=hidden])');
  (field || dialog.querySelector('button'))?.focus();
}
document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
dialogs.forEach(dialog => {
  dialog.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); dialog.close(); } });
  dialog.addEventListener('close', () => previousFocus?.focus());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r=dialog.getBoundingClientRect(); if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close(); } });
});
const searchDialog=document.querySelector('[data-search-dialog]');
document.querySelectorAll('[data-open-search]').forEach(button=>button.addEventListener('click',()=>openDialog(searchDialog)));
const search=document.querySelector('[data-search-input]');
search?.addEventListener('input',()=>{const query=search.value.trim().toLocaleLowerCase('ru');let count=0;document.querySelectorAll('[data-search-item]').forEach(item=>{item.hidden=!item.dataset.searchText.toLocaleLowerCase('ru').includes(query);if(!item.hidden)count++;});document.querySelector('[data-search-empty]').hidden=count>0;});
const cookieDialog=document.querySelector('[data-cookie-dialog]');
document.querySelectorAll('[data-open-cookies]').forEach(button=>button.addEventListener('click',()=>openDialog(cookieDialog)));
document.querySelectorAll('[data-cookie-choice]').forEach(button=>button.addEventListener('click',()=>{try{localStorage.setItem('aerzen-cookie-preferences',JSON.stringify({choice:button.dataset.cookieChoice,version:1,updatedAt:new Date().toISOString()}));}catch{}document.querySelector('[data-cookie-status]').textContent='Выбор сохранён. Дополнительные сервисы не подключены.';}));
document.querySelectorAll('[data-print]').forEach(button=>button.addEventListener('click',()=>window.print()));
document.querySelectorAll('[data-request-form]').forEach(form=>{
 form.addEventListener('submit',event=>{const email=form.querySelector('[name=email]');const phone=form.querySelector('[name=phone]');if(!email.value.trim()&&!phone.value.trim()){event.preventDefault();form.classList.add('form-invalid');phone.setCustomValidity('Укажите телефон или e-mail, чтобы мы могли ответить.');phone.reportValidity();return;}phone.setCustomValidity('');const button=form.querySelector('[type=submit]');if(button){button.disabled=true;button.setAttribute('aria-busy','true');form.querySelector('.form-feedback').textContent='Отправляем…';}});
 form.querySelectorAll('[name=phone],[name=email]').forEach(input=>input.addEventListener('input',()=>form.querySelector('[name=phone]').setCustomValidity('')));
});
window.addEventListener('pageshow',()=>document.querySelectorAll('[data-request-form] [aria-busy]').forEach(b=>{b.disabled=false;b.removeAttribute('aria-busy');}));

/* Photo links remain ordinary files without JS or native dialog support. */
document.querySelectorAll('[data-photo-gallery]').forEach(gallery => {
  const links = [...gallery.querySelectorAll('[data-photo-open]')];
  const dialog = gallery.querySelector('[data-photo-dialog]');
  if (!dialog || !('showModal' in dialog)) return;
  const image = dialog.querySelector('[data-photo-full]');
  const stage = dialog.querySelector('[data-photo-stage]');
  const status = dialog.querySelector('[data-photo-status]');
  const caption = dialog.querySelector('[data-photo-caption]');
  const position = dialog.querySelector('[data-photo-position]');
  const source = dialog.querySelector('[data-photo-source]');
  const previous = dialog.querySelector('[data-photo-prev]');
  const next = dialog.querySelector('[data-photo-next]');
  let activeIndex = 0;

  function showPhoto(index) {
    if (index < 0 || index >= links.length) return;
    activeIndex = index;
    const link = links[index];
    image.hidden = true;
    stage.setAttribute('aria-busy', 'true');
    status.textContent = 'Загружаем фотографию…';
    caption.textContent = link.dataset.photoCaption;
    position.textContent = `${index + 1} / ${links.length}`;
    source.href = link.href;
    image.alt = link.dataset.photoAlt;
    image.src = link.href;
    previous.disabled = index === 0;
    next.disabled = index === links.length - 1;
  }

  image.addEventListener('load', () => {
    if (!dialog.open) return;
    image.hidden = false;
    stage.setAttribute('aria-busy', 'false');
    status.textContent = '';
  });
  image.addEventListener('error', () => {
    if (!dialog.open) return;
    image.hidden = true;
    stage.setAttribute('aria-busy', 'false');
    status.textContent = 'Фотография не загрузилась. Откройте файл отдельно или выберите другой снимок.';
  });
  links.forEach((link, index) => link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    openDialog(dialog);
    showPhoto(index);
  }));
  previous.addEventListener('click', () => showPhoto(activeIndex - 1));
  next.addEventListener('click', () => showPhoto(activeIndex + 1));
  dialog.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showPhoto(activeIndex + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  dialog.addEventListener('close', () => {
    image.hidden = true;
    image.removeAttribute('src');
    stage.setAttribute('aria-busy', 'false');
    status.textContent = '';
  });
});
