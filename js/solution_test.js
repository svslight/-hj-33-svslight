'use strict';

const urlHttp = 'https://neto-api.herokuapp.com';
const urlWss = 'wss://neto-api.herokuapp.com/pic';

const errorTypeFile = 'Неверный формат файла. Пожалуйста, выберите изображение в формате .jpg или .png.';
const errorDownload = 'Чтобы загрузить новое изображение, пожалуйста, воспользуйтесь пунктом "Загрузить новое" в меню';

const wrapCommentsCanvas = document.createElement('div');
const canvas = document.createElement('canvas'); 

let host;
let dataParser;

const error = document.querySelector('.error')
const menu = document.querySelector('.menu');		
const menuNew = menu.querySelector('.new');
const menuBurger = menu.querySelector('.burger');
const menuShare = menu.querySelectorAll('.share');
const menuUrl = menu.querySelector('.menu__url');
const menuMode = menu.querySelectorAll('.mode');
const menuComments = menu.querySelector('.comments');
const menuDraw = menu.querySelector('.draw');
	
const app = document.querySelector('.app');
const currentImage = document.querySelector('.current-image');
const loader = document.querySelector('.image-loader');	

const commentsForm = document.querySelector('.comments__form');	

// Скрыть текст ошибки через 5сек
function hiddenTextError() {
  setTimeout(() => {
    hideAttr(error);
  }, 5000);
}
	
// Скрыть атрибут
function hideAttr(obj) {
  obj.style.display = 'none';
}

// Показать атрибут
function showAttr(obj) {
  obj.style.display = 'inline-block';
}

// Перемещение (drag) меню
let movedPiece = null;
let minY, minX, maxX, maxY;
let shiftX = 0;
let shiftY = 0;

const dragStart = event => {
  if (!event.target.classList.contains('drag')) {return;}
	
  movedPiece = event.target.parentElement;
  minX = app.offsetLeft;
  minY = app.offsetTop;
	  
  maxX = app.offsetLeft + app.offsetWidth - movedPiece.offsetWidth;
  maxY = app.offsetTop + app.offsetHeight - movedPiece.offsetHeight;
	  
  shiftX = event.pageX - event.target.getBoundingClientRect().left - window.pageXOffset;
  shiftY = event.pageY - event.target.getBoundingClientRect().top - window.pageYOffset;
}
  
const drag = event => {
  if (!movedPiece) {return;}
	
  let x = event.x - shiftX;
  let y = event.y - shiftY;
	  
  x = Math.min(x, maxX);
  y = Math.min(y, maxY);
  x = Math.max(x, minX);
  y = Math.max(y, minY);
  movedPiece.style.left = x + 'px';
  movedPiece.style.top = y + 'px';
};

const drop = event => {
  if (movedPiece) { movedPiece = null; }
} 

document.addEventListener('mousedown', dragStart);
document.addEventListener('mousemove', throttle(drag));
document.addEventListener('mouseup', drop);

function throttle(callback) {
  let isWaiting = false;
  return function (...rest) {
    if (!isWaiting) {
      callback.apply(this, rest);
      isWaiting = true;
      requestAnimationFrame(() => {
	    isWaiting = false;
      });
    }
  };
}  

// Разбивка timestamp на читаемое отображение даты и времени
function getDate(timestamp) {
  const options = {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  const date = new Date(timestamp);
  const dateStr = date.toLocaleString('ru-RU', options);

  return dateStr.slice(0, 8) + dateStr.slice(9);
}

modePublication();	

// Публикация --------------------

function modePublication() {
  // Убираем изображение
  currentImage.src = ''; 
	
  // Скрываем пункты меню
  menu.dataset.state = 'initial'; 
  app.dataset.state = '';
  hideAttr(menuBurger);   
	
  // Удаляем комментарии в режиме - Публикация
  app.removeChild(commentsForm); 	
  
  menuNew.addEventListener('click', selectFile);  
  app.addEventListener('drop', onDropFile);
  app.addEventListener('dragover', event => event.preventDefault()); 
} 

// Выбор файла
function selectFile(event) {
  const input = document.createElement('input');
  input.id = 'fileId';
  input.type = 'file';	
  menu.appendChild(input);
  hideAttr(input);           

  // Вызов окна для выбора файла
  input.click();        	
  
  currentImage.dataset.load = ''; 
	
  input.addEventListener('change', uploadFile);
}
  	
function uploadFile(event) {	
  event.preventDefault();
  showAttr(loader);          
  const files = Array.from(event.currentTarget.files);	
  checkFile(files); 
} 	
	
function onDropFile(event) {
  event.preventDefault();	 
  showAttr(loader);          
  const files = Array.from(event.dataTransfer.files);
  checkFile(files);	
} 
	
function checkFile(files) {	
  files.forEach(file => {	
	  
    // Проверка повторной загрузки img 
    if (currentImage.dataset.load) {		
      showAttr(error);                   	
      error.lastElementChild.textContent = errorDownload;		  
      hiddenTextError();	   // скрываем сообщение error ч/з 5сек         
      hideAttr(loader);  		
      return;
    }	
	  
    // Проверка типа файла	  
    if (file.type === 'image/jpeg' || file.type === 'image/png') {	  
      sendFileServer(files);        // Отправить файл на сервер 
    } else {
      hideAttr(loader);             
      showAttr(error);             	
      error.lastElementChild.textContent = errorTypeFile;
      hiddenTextError();		// Скрываем сообщение error ч/з 5сек   
    }		
  });
} 
		
// Отправка файла на сервер и получение id 
function sendFileServer(files) {	  
  const dataForm = new FormData();
	  
  files.forEach(file => {
    dataForm.append('title', file.name);
    dataForm.append('image', file);
  });
	
  fetch(`${urlHttp}/pic`, {
    body: dataForm,
    credentials: 'same-origin',
    method: 'POST'
  })
  .then(result => {
    if (result.status >= 200 && result.status < 300) {
      currentImage.dataset.load = 'load';
      return result;	  
    }
    throw new Error (result.statusText);
  })
  .then(result => result.json())
  .then(result => getFileServer(result.id))   // Получить информацию о файле
  .catch(error => {
    console.log(`Ошибка отправки файла на сервер: ${error.message}`);
    hideAttr(loader);   
  })		
} 

// Получаем информацию о файле 
function getFileServer(id) {
  const xhrGet = new XMLHttpRequest();
  xhrGet.open('GET', `${urlHttp}/pic/${id}`, false);
  xhrGet.send();
	
  dataParser = JSON.parse(xhrGet.responseText);
  host = `${window.location.origin}${window.location.pathname}?id=${dataParser.id}`;
  
  currentImage.src = dataParser.url;  // Загрузка изображения	

  menuBurger.style.cssText = ``;
  showMenu('share');           // Показываем режим Поделиться
  menuUrl.value = host;        // Устанавливаем ссылку для копирования	
	
  currentImage.addEventListener('load', () => {
    hideAttr(loader);     
    createWrapCommentsCanvas();
    createCanvas();
  });

  wss();
  console.log('??????? dataParser= ', dataParser);
//  updateCommentForm(dataParser.comments);	
  console.log('??????? dataParser= ', dataParser.comments);
	
} 

// Рецензирование ---------------------- 

// Копирование ссылки и переход из режима Поделиться - Комментирование
const copyUrl = document.querySelector('.menu_copy'); // кнопка - Копировать

copyUrl.addEventListener('click', event => {	
  // Выбор ссылки и команда копирования
  menuUrl.select();    	
  const successfully = document.execCommand('copy'); 	
	
  const message = successfully ? 'скопирован успешно' : 'не скопирован';
  console.log(`URL ${message}`);  
  
  hideMenu('share');     
  showMenu('comments');  
	
});

// Переключение меню
menuBurger.addEventListener('click', toggleMenu); 

function toggleMenu() {
  menu.dataset.state = 'default';
	
  Array.from(menu.querySelectorAll('.mode')).forEach(modeItem => {
    modeItem.dataset.state = '';	  
    modeItem.addEventListener('click', () => {
		
      if (!modeItem.classList.contains('new')) {
        menu.dataset.state = 'selected';
        modeItem.dataset.state = 'selected';
      }	 
		
      if (modeItem.classList.contains('share')) {
        menuUrl.value = host;
      }
    });	
  });
}

// Показать режим в меню
function showMenu(regime) {
  menu.dataset.state = 'default';   // показ все эл.меню кроме burger
	
  Array.from(menu.querySelectorAll('.mode')).forEach(modeItem => {	  
    if (!modeItem.classList.contains(regime)) { return; }	  
    menu.dataset.state = 'selected';
    modeItem.dataset.state = 'selected';	  
  });	
} 

// Скрыть режим в меню
function hideMenu(regime) {		
  Array.from(menu.querySelectorAll('.mode')).forEach(modeItem => {	  
    if (!modeItem.classList.contains(regime)) { return; }	  
    menu.dataset.state = 'none';
    modeItem.dataset.state = 'none';	  
  });	
} 

// Режим Комментирования -------------------

const commentsOn = document.querySelector('#comments-on');
const commentsOff = document.querySelector('#comments-off');

// Переключение маркеров
commentsOff.addEventListener('click', toggleMarkerOff);
commentsOn.addEventListener('click', toggleMarkerOn);

// Скрыть маркеры
function toggleMarkerOff() {  
  const forms = document.querySelectorAll('.comments__form');
  Array.from(forms).forEach(form => {
    form.style.display = 'none';
  });	
}

// Показать маркеры
function toggleMarkerOn() {  
  const forms = document.querySelectorAll('.comments__form');
  Array.from(forms).forEach(form => {
    form.style.display = '';
  });
}

// Создание холста для рисования 
function createCanvas() {    
  const width = getComputedStyle(app.querySelector('.current-image')).width.slice(0, -2);
  const height = getComputedStyle(app.querySelector('.current-image')).height.slice(0, -2);
  canvas. width = width;
  canvas.height = height;
	
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.display = 'block';
  canvas.style.zIndex = '1';  
  
  wrapCommentsCanvas.appendChild(canvas);	
}

// Создание обертки для комментариев
function createWrapCommentsCanvas() {  
  const width = getComputedStyle(app.querySelector('.current-image')).width;
  const height = getComputedStyle(app.querySelector('.current-image')).height;  
    
  wrapCommentsCanvas.style.cssText = `
    width: ${width};
    height: ${height};
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: block;    
  `;
  app.appendChild(wrapCommentsCanvas);
  console.log('app', app)
  
  // Отображение комментариев маркера поверх остальных маркеров
  wrapCommentsCanvas.addEventListener('click', event => {	  
    if (event.target.closest('form.comments__form')) {	
        
      Array.from(wrapCommentsCanvas.querySelectorAll('form.comments__form')).forEach(form => {
        form.style.zIndex = 2;  
      });      
      event.target.closest('form.comments__form').style.zIndex = 3;       
    }
  });    
} 

// Создание формы для комментариев 
canvas.addEventListener('click', checkComment);

function checkComment(event) {	
  if (!(menuComments.dataset.state === 'selected') || !(commentsOn.checked)) { return; }	

  // Логика: если есть открытая форма, то сворачиваем её
//  console.log('checkComment', checkComment);     
//  console.log('EVENT = ', event.currentTarget);
//  const point = event.currentTarget;
//  const id = point.dataset.id;
//  const form = app.querySelector(`.comments__form[data-id='${id}']`);   
//  console.log('EVENT form = ', form);
    
//  const showedForm = findShowedForm();  
//  
//  if (showedForm) {
//    console.log('есть открытая форма showedForm', showedForm);
//    hideForm(showedForm);
//  } else {
//    console.log('checkComment - Нет showedForm');
//    const newCommentForm = createCommentForm(event.offsetX, event.offsetY); 
//    console.log('checkComment - newCommentForm', newCommentForm);
//  }
//  (isShowedForm(form)) ? hideForm(form) : showForm(form);
    
//  const newCommentForm = createCommentForm(event.offsetX, event.offsetY); 
  wrapCommentsCanvas.appendChild(createCommentForm(event.offsetX, event.offsetY));  
    
} //checkComment


//---------------------------------------
function isMarker(form) {
    console.log(form.querySelector('.comments__marker'));
    return form.querySelector('.comments__marker') !== null;
}

function isMessage(form) {
    console.log(form.querySelector('.comment__message'));
	return form.querySelector('.comment__message') === '';
}

function showForm(f) {
    console.log('showForm= ', f.style.display);
	f.style.display = 'block';    
}

function isShowedForm(form) {
//    console.log('isShowedForm= ',  form.style.display);
    console.log('isShowedForm  form = ',  form);
	return form.style.display !== 'none';
}

function findShowedForm() {
  const forms = app.querySelectorAll('.comments__form');
  console.log('FFF findShowedForm= ', forms)
  return Array.from(forms).find(isShowedForm);
}

function hideForm(form) {
  console.log('hideForm - Проверка: если в форме пустой текст, то удаляем точку и форму');
  console.log('hideForm form = ', form);
    
  const id = form.dataset.id;
  const formId = document.querySelector(`.comments__form[data-id='${id}']`);
    
  console.log('2 hideForm id - formId= ', id, formId);
    
  const comment = form.querySelector('.comment');  
  const newMessage = form.querySelector('.comment__message');
  const checkboxMarker = form.querySelector('.comments__marker-checkbox'); // Бокс 
  const commentsMarker = form.querySelector('.comments__marker'); // Маркер
  const commentsBody = form.querySelector('.comments__body'); // Тело комментариев

  console.log('4 hideForm newMessage = ', newMessage);
  console.log('4 hideForm checkboxMarker = ', checkboxMarker);
  console.log('4 hideForm commentsMarker = ', commentsMarker);
  console.log('4 hideForm commentsBody = ', commentsBody);
  console.log('4 hideForm form.style.display = ', form.style.display);
    
  // Проверка: если в форме ещё ни одного комментария и пустой текст, то удаляем точку и форму
    
  if (!newMessage) {
      
    console.log('!!!!??? Нет сообщения - удалить пустую форму', id);
    wrapCommentsCanvas.removeChild(form); 
      
  } else {          
    console.log('+++ Есть сообщение - форму с сообщением свернуть'); 
    console.log('4 hideForm form.style.display = ', form.style.display);
     
    form.style.display = 'none';
//    commentsBody.style.display = 'none';  
  } 
} // hideForm

// ----------------------------------------------------------

// Форма для комментариев
function createCommentForm(x, y) {
  const formComment = document.createElement('form');
  formComment.classList.add('comments__form');
  formComment.innerHTML = `
    <span class="comments__marker"></span><input type="checkbox" class="comments__marker-checkbox">
      <div class="comments__body">
        <div class="comment">
          <div class="loader">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>            
        </div>          
        <textarea class="comments__input" type="text" 
        placeholder="Напишите ответ..."></textarea>
        <input class="comments__close" type="button" value="Закрыть">
        <input class="comments__submit" type="submit" value="Отправить">
      </div>`;
    
//  wrapCommentsCanvas.appendChild(formComment);
    
  //смещение, чтобы маркер встал туда, куда кликнули
  const left = x - 22;
  const top = y - 14;
  const max = 1000, min = 50;
  const newId = Math.floor(Math.random() * (max - min)) + min;
  	
  formComment.style.cssText = `
    top: ${top}px;
    left: ${left}px;
    z-index: 2;  
    id: ${newId};
  `;	
  formComment.dataset.left = left;
  formComment.dataset.top = top;
  formComment.dataset.id = newId;
    
  const loaderComment = formComment.querySelector('.loader'); 
  hideAttr(loaderComment.parentElement);    // убираем Loader ...      
  
  const btnCommentsClose = formComment.querySelector('.comments__close'); // Кнопка Закрыть
  const checkboxMarker = formComment.querySelector('.comments__marker-checkbox'); // Бокс 
  const commentsMarker = formComment.querySelector('.comments__marker'); // Маркер
  const commentsBody = formComment.querySelector('.comments__body'); // Тело комментариев
    
  console.log('Стиль display  formComment= ', formComment.style.display);
  formComment.style.display = 'block'; 
    
  checkboxMarker.checked = true;  //Разворачиваем форму 
  console.log('heckboxMarker = ', checkboxMarker);
    
  //Разворачиваем форму 
  commentsBody.style.display = 'block';  
  console.log('Стиль display commentsBody = ', commentsBody);
  console.log('Стиль display commentsBody = ', commentsBody.style.display);
   
  commentsMarker.style.display = 'block';  
  console.log('Стиль display commentsMarker = ', commentsMarker);  
  console.log('Стиль display commentsMarker = ', commentsBody.style.display);
    
    
  // Удалить пустую форму и закрыть маркер при создании    
  const showedForm = findShowedForm();  
    
  if (showedForm) {       
    console.log('2 Есть showedForm', showedForm);
      
    hideForm(showedForm); 
      
    console.log('3 Есть isShowedForm(showedForm)', isShowedForm(showedForm)); 
      
    if (!isShowedForm(showedForm)) {  
        
//      const child = showedForm.getElementsByClassName('comments__marker-checkbox');
//        for(var e = 0; e <= child.length; e++){
//          console.log(child[e].parentNode);
//          child[e].parentNode.style.display = "none"; 
//        }
        
//      const main = document.getElementsByClassName('comments__form'); 
//        for (let i = 0; i < main.length; i++) {
//          console.log('?????main= ', main, main.length);
//          if (main[i].children[1].classList[1] === "comments__marker-checkbox") {
////            main[i].style.display = "block";
//              main[i].checked = true;
//          }
//        }      

    }  // if (!isShowedForm(showedForm))
      
    console.log('4 Есть isShowedForm(showedForm)', isShowedForm(showedForm));
      
  } // if (showedForm)
      
    
//  (isShowedForm(showedForm)) ? hideForm(showedForm) : showForm(showedForm);   
    
  // Показать комментарии
  checkboxMarker.addEventListener('click', event => {
    commentsBody.style.display = 'block'; 
  });
          
 // Логика: если есть открытая форма, то сворачиваем её
//  formComment.addEventListener('click', event => {
//    console.log('EVENT = ', event.currentTarget);
//    const point = event.currentTarget;
//    const id = point.dataset.id;
//    const form = app.querySelector(`.comments__form[data-id='${id}']`);  //findFormById(id); 
//    console.log('EVENT form = ', form);
//    
////    const showedForm = findShowedForm();
////    if (showedForm) {
////      console.log('есть открытая форма showedForm', showedForm);
////      hideForm(showedForm);
////    }      
//    console.log('При клике на точку: если форма для этой точки показана, то сворачиваем, и наоборот');
//    console.log('Логика isShowedForm', isShowedForm);
////    (isShowedForm(form)) ? hideForm(form) : showForm(form);
//  });   
  
//  (isShowedForm(showedForm)) ? hideForm(showedForm) : showForm(showedForm);  
    
    
    
  // Кнопка Закрыть (или удалить пустую форму)
  btnCommentsClose.addEventListener('click', event => {         

    const commentMessage = formComment.querySelector('.comment__message');  
    console.log('commentsMarker', commentsMarker, commentMessage);
      
    if (commentMessage) {
        
      console.log('+++ Кнопка Есть сообщение - свернуть форму', commentMessage); 
      commentsBody.style.display = 'none';     // сварачиваем тело
      //      checkboxMarker.checked = false;   // сварачиваем форму
        
    } else {    
        
      console.log('??? Кнопка Нет сообщения - удалить маркера и свернуть форму', commentMessage);        
      formComment.removeChild(commentsMarker);  // уд. маркера
      commentsBody.style.display = 'none';     // сварачиваем тело
      //      checkboxMarker.checked = false;          // сварачиваем форму
    }
  });
	
  // Клик по маркеру - Не сварачивать форму	
  checkboxMarker.addEventListener('click', () => {
    commentsMarker.style.display = 'block';
//    checkboxMarker.checked = true;
  });    
      
    
  //  Кнопка Отправить комментарий	    
  formComment.addEventListener('submit', formMessage);    
    
  function formMessage(event) {	
    event.preventDefault();
      
    const message = formComment.querySelector('.comments__input').value;
    const formMessage = `message=${encodeURIComponent(message)}&left=${encodeURIComponent(left)}&top=${encodeURIComponent(top)}`;
	
    if (message) { 
        
      sendComments(formMessage);  // Отправить комментарий на сервер          
      showAttr(loaderComment.parentElement);       // показывае Loader ...
      formComment.querySelector('.comments__input').value = '';  // очистить поле    
        
    } else { 
        
      alert('Нужен комментарий!');   
      hideAttr(loaderComment.parentElement);    // убираем Loader ... 
        
    } 
  }  // formMessage    
    
  // Отправить комментарий на сервер
  function sendComments(message) {
    fetch(`${urlHttp}/pic/${dataParser.id}/comments`, {
      method: 'POST',
      body: message,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    .then( result => {
      if (result.status >= 200 && result.status < 300) {
        console.log('Комментарий отправлен: ', result);
        return result;
      }
      throw new Error (result.statusText);
    })
    .then(result => result.json())
    .catch(error => {
      console.log(`Ошибка отправки комментария на сервер: ${error.message}`);
//      hideAttr(loaderComment.parentElement);  
        loaderComment.parentElement.style.display = 'none';
    });
  } // sendComments
    
  console.log('END - formComment', formComment);   
    
  return formComment; 	
    
} // createCommentForm

// Добавление комментария в форму
function addMessageComment(message, form) {
  let parentLoaderDiv = form.querySelector('.loader').parentElement;
	
  const newMessageDiv = document.createElement('div');
  newMessageDiv.classList.add('comment');
  newMessageDiv.dataset.timestamp = message.timestamp;
    
  const commentTimeP = document.createElement('p');
  commentTimeP.classList.add('comment__time');
  commentTimeP.textContent = getDate(message.timestamp);
  newMessageDiv.appendChild(commentTimeP);
    
  const commentMessageP = document.createElement('p');
  commentMessageP.classList.add('comment__message');
  commentMessageP.textContent = message.message;
  newMessageDiv.appendChild(commentMessageP);
  console.log('4 addMessageComment', newMessageDiv);
	
  form.querySelector('.comments__body').insertBefore(newMessageDiv, parentLoaderDiv);
  console.log('5 addMessageComment form', form);
}

// Обновление форм с комментариями
let showComments = {};

function updateCommentForm(newComment) {    
  console.log('1 updateCommentForm newComment=', newComment);
    
  if (!newComment) { return; }
    
  Object.keys(newComment).forEach(id => {      
    if (id in showComments) { return; }       
    showComments[id] = newComment[id];
    let needCreateNewForm = true;
	  
    const appCommentsForm = app.querySelectorAll('.comments__form');	  
    Array.from(appCommentsForm).forEach(form => {        
      if (+form.dataset.left === showComments[id].left && +form.dataset.top === showComments[id].top) {           
        form.querySelector('.loader').parentElement.style.display = 'none';  // убираем Loader ...
        addMessageComment(newComment[id], form);        
        console.log('updateCommentForm showComments', showComments);
//        needCreateNewForm = false;
      }
    });
    
//    // Создание формы и добавлениее сообщений
//    if (needCreateNewForm) {
//      const newForm = createCommentForm(newComment[id].left + 22, newComment[id].top + 14);
//      newForm.dataset.left = newComment[id].left;
//      newForm.dataset.top = newComment[id].top;
//      newForm.style.left = newComment[id].left + 'px';
//      newForm.style.top = newComment[id].top + 'px';
//      
//      wrapCommentsCanvas.appendChild(newForm);
//      addMessageComment(newComment[id], newForm);
//        
//      console.log('newForm', newForm);
//      console.log('app #comments-on= ', app.querySelector('#comments-on'));
//      console.log('app= ', app);
//        
//      if (!app.querySelector('#comments-on').checked) {
//        newForm.style.display = 'none';
//      }
//    }     

/*
  const formMarker = document.createElement('span');
  formComment.classList.add('comments__marker');
  formComment.innerHTML = `
    <span class="comments__marker"></span><input type="checkbox" class="comments__marker-checkbox">
      <div class="comments__body">
        <div class="comment">
          <div class="loader">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>            
        </div>          
        <textarea class="comments__input" type="text" 
        placeholder="Напишите ответ..."></textarea>
        <input class="comments__close" type="button" value="Закрыть">
        <input class="comments__submit" type="submit" value="Отправить">
      </div>`;
    
//  wrapCommentsCanvas.appendChild(formComment);
    
  //смещение, чтобы маркер встал туда, куда кликнули
  const left = x - 22;
  const top = y - 14;
  const max = 1000, min = 50;
  const newId = Math.floor(Math.random() * (max - min)) + min;
  	
  formComment.style.cssText = `
    top: ${top}px;
    left: ${left}px;
    z-index: 2;  
    id: ${newId};
  `;	
  formComment.dataset.left = left;
  formComment.dataset.top = top;
  formComment.dataset.id = newId;    
  
*/
      
      
  });    
} // updateCommentForm



// Вставка полученных с сервера комментариев
function insertWssCommentForm(wssComment) {
  console.log('1 insertWssCommentForm');
  const wsCommentEditor = {};
  console.log('2 insertWssCommentForm');
  wsCommentEditor[wssComment.id] = {};
  wsCommentEditor[wssComment.id].left = wssComment.left;
  wsCommentEditor[wssComment.id].message = wssComment.message;
  wsCommentEditor[wssComment.id].timestamp = wssComment.timestamp;
  wsCommentEditor[wssComment.id].top = wssComment.top;
  console.log('3 insertWssCommentForm', wsCommentEditor);
  updateCommentForm(wsCommentEditor);
}

// Получение информации через webSocket
let connection;
function wss() {
  connection = new WebSocket(`${urlWss}/${dataParser.id}`);
  connection.addEventListener('message', event => {
		
    console.log('event:', JSON.parse(event.data));
    if (JSON.parse(event.data).event === 'pic') {
      if (JSON.parse(event.data).pic.mask) {
        canvas.style.background = `url(${JSON.parse(event.data).pic.mask})`;
      }
    }

    if (JSON.parse(event.data).event === 'comment') {
      insertWssCommentForm(JSON.parse(event.data).comment);
    }

    if (JSON.parse(event.data).event === 'mask') {
      canvas.style.background = `url(${JSON.parse(event.data).url})`;
    }		
  });
}


// Режим Рисования  --------------

let currentColor;
Array.from(menu.querySelectorAll('.menu__color')).forEach(color => {
  if (color.checked) {
    currentColor = getComputedStyle(color.nextElementSibling).backgroundColor;
  }

  color.addEventListener('click', (event) => {
    currentColor = getComputedStyle(event.currentTarget.nextElementSibling).backgroundColor;
  });
});

const ctx = canvas.getContext('2d');
const brushRadius = 4;
let curves = [];
let drawing = false;
let needsRepaint = false;

function canvasClearRect(event) { 
  ctx.clearRect(0, 0, canvas.width, canvas.height);	
  curves = []; 
}

function circle(point) {
  ctx.beginPath();
  ctx.arc(...point, brushRadius / 2, 0, 2 * Math.PI);
  ctx.fill();
}

function smoothCurveBetween (p1, p2) {
  const cp = p1.map((coord, idx) => (coord + p2[idx]) / 2);
  ctx.quadraticCurveTo(...p1, ...cp);
}

function smoothCurve(points) {
  ctx.beginPath();
  ctx.lineWidth = brushRadius;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.moveTo(...points[0]);

  for(let i = 1; i < points.length - 1; i++) {
    smoothCurveBetween(points[i], points[i + 1]);
  }

  ctx.stroke();
}

// Координаты положения курсора
function makePoint(x, y) {
  return [x, y];
};

canvas.addEventListener("mousedown", event => {
  if (!(menuDraw.dataset.state === 'selected')) { return; }
  drawing = true;

  const curve = []; 
  curve.color = currentColor;

  curve.push(makePoint(event.offsetX, event.offsetY)); 
  curves.push(curve); 
  needsRepaint = true;
});

canvas.addEventListener("mouseup", event => {
  drawing = false;
});

canvas.addEventListener("mouseleave", event => {
  drawing = false;
});

canvas.addEventListener("mousemove", event => {
  if (drawing) {
    const point = makePoint(event.offsetX, event.offsetY)
    curves[curves.length - 1].push(point);
    needsRepaint = true;
    trottledSendMask();
  }
});

canvas.addEventListener('dblclick', canvasClearRect);

const trottledSendMask = throttleCanvas(sendMaskState, 1000);

// Перерисовка canvas
function repaint() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
	
  curves.forEach((curve) => {
    ctx.strokeStyle = curve.color;
    ctx.fillStyle = curve.color;
	      
    circle(curve[0]);
    smoothCurve(curve);
  });
}

// Отправка канвас на сервер
function sendMaskState() {
  canvas.toBlob(function (blob) {
    connection.send(blob);
    console.log('Отправлено: ', connection);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
}

function throttleCanvas(callback, delay) {
  let isWaiting = false;
  return function () {
    if (!isWaiting) {
      isWaiting = true;
      setTimeout(() => {
        callback();
        isWaiting = false;
      }, delay);
    }
  }
}

// Анимация
function tick() {
  // Двигаем меню если оно находится с края окна и не помещается при развертывании
  if (menu.offsetHeight > 66) {
    menu.style.left = (app.offsetWidth - menu.offsetWidth) - 10 + 'px';
  }
  if (needsRepaint) {		
    repaint();
    needsRepaint = false;      
  }

  window.requestAnimationFrame(tick);
}

tick();