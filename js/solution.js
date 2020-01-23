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
    hide(error);
  }, 5000);
}
	
// Скрыть объект
function hide(obj) {
  obj.style.display = 'none';
}

// Показать объект
function show(obj) {
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

/* Формат даты */
function formatData(data) {
    if (data < 10) {
        return '0' + data;
    } else return data;
};

modePublication();	

// Публикация
function modePublication() {
  // Убираем изображение
  currentImage.src = ''; 
	
  // Скрываем пункты меню
  menu.dataset.state = 'initial'; 
  app.dataset.state = '';
  hide(menuBurger);   
	
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
  hide(input);           

  // Вызов окна для выбора файла
  input.click();        	
  
  currentImage.dataset.load = ''; 
	
  input.addEventListener('change', uploadFile);
}
  	
function uploadFile(event) {	
  event.preventDefault();
  show(loader);          
  const files = Array.from(event.currentTarget.files);	
  checkFile(files); 
} 	
	
function onDropFile(event) {
  event.preventDefault();	 
  show(loader);          
  const files = Array.from(event.dataTransfer.files);
  checkFile(files);	
} 
	
function checkFile(files) {	
  files.forEach(file => {	
	  
    // Проверка повторной загрузки img 
    if (currentImage.dataset.load) {		
      show(error);                   	
      error.lastElementChild.textContent = errorDownload;		  
      hiddenTextError();	           
      hide(loader);  		
      return;
    }	
	  
    // Проверка типа файла	  
    if (file.type === 'image/jpeg' || file.type === 'image/png') {	  
      sendFileServer(files);         
    } else {
      hide(loader);             
      show(error);             	
      error.lastElementChild.textContent = errorTypeFile;
      hiddenTextError();		   
    }		
  });
} 
		
// Отправка файла на сервер и получение id изображения
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
  .then(result => getFileServer(result.id))   
  .catch(error => {
    console.log(`Ошибка отправки файла на сервер: ${error.message}`);
    hide(loader);   
  })		
} 

// Получаем информацию о файле 
function getFileServer(id) {
  const xhrGet = new XMLHttpRequest();
  xhrGet.open('GET', `${urlHttp}/pic/${id}`, false);
  xhrGet.send();
	
  dataParser = JSON.parse(xhrGet.responseText);
    
  host = `${window.location.origin}${window.location.pathname}?id=${dataParser.id}`;
  
  // Сохраняем полученные данные в sessionStorage
  sessionStorage.id = dataParser.id; 
  sessionStorage.url = dataParser.url;
    
  // Загрузка изображения  
  currentImage.src = dataParser.url;  	

  // Показываем режим Поделиться и Устанавливаем ссылку для копирования
  menuBurger.style.cssText = ``;
  showMenu('share');           
  menuUrl.value = host;        	
	
  currentImage.addEventListener('load', () => {
    hide(loader);     
    createWrapCommentsCanvas();
    createCanvas();
  });

  wss();	
} 

// Перезагрузка страницы с сохраненными данными в sessionStorage
function requestImageInfo() { 
  if (sessionStorage.id) {
    getFileServer(sessionStorage.id)
  } 
}

document.addEventListener('DOMContentLoaded', requestImageInfo);

// Рецензирование  
// Копирование ссылки и переход из режима Поделиться  в режим Комментирование
const copyUrl = document.querySelector('.menu_copy'); 

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
    
  // показ все эл.меню кроме burger
  menu.dataset.state = 'default';   
	
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

// Режим Комментирования 
function showForm(form) {
  form.style.display = 'block';    
}

function isShowedForm(form) {
  return form.style.display !== 'none';
}

function findShowedForm() {
  const forms = app.querySelectorAll('.comments__form');
  return Array.from(forms).find(isShowedForm);
}

function hideForm(form) {  
  const idMarker = form.dataset.id;  
  const marker = document.querySelector(`.comments__marker[data-id='${idMarker}']`);
  const newMessage = form.querySelector('.comment__message');    
    
  if (!newMessage) {
      
    wrapCommentsCanvas.removeChild(marker);  
    wrapCommentsCanvas.removeChild(form); 
      
  } else {
      
    form.style.display = 'none';
      
  } 
} 

// Переключение маркеров
const commentsOn = document.querySelector('#comments-on');
const commentsOff = document.querySelector('#comments-off');

function showMarker(marker) {
	marker.style.display = 'block';
}

function hideMarker(marker) {
	marker.style.display = 'none';
}

commentsOn.addEventListener('click', showAllMarkers);
commentsOff.addEventListener('click', hideAll);

// Показать маркеры
function showAllMarkers() {  
  const markers = document.querySelectorAll(`.comments__marker`);
  Array.from(markers).forEach(showMarker);     
}

// Скрыть: маркеры, формы
function hideAll() {  
 const markers = document.querySelectorAll(`.comments__marker`);
 Array.from(markers).forEach(hideMarker); 
    
 const forms = document.querySelectorAll(`.comments__form`);
 Array.from(forms).forEach(hideForm);  
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
//  console.log('app', app)
  
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

// Создание комментариев 
canvas.addEventListener('click', checkComment);

function checkComment(event) {	
  if (!(menuComments.dataset.state === 'selected') || !(commentsOn.checked)) { return; }        
  wrapCommentsCanvas.appendChild(createCommentForm(event.offsetX, event.offsetY));     
}

// Создание Маркера
const el = (name, props, ...childs) => ({name, props, childs});
 
function createMarker(x, y, id) {    
  const markerStruct = el('div', { 
    'class': 'comments__marker', 
    'style': `position: absolute; left: ${x-13}px; top:${y-10}px; z-index: 2;`, 
    'data-id': `${id}` 
  });
    
  const newMarker = createElement(markerStruct);	
  wrapCommentsCanvas.appendChild(newMarker);    
   
  newMarker.addEventListener('click', openForm);
}

function openForm(event) {    
  const point = event.currentTarget;
  const id = point.dataset.id;
  const form = document.querySelector(`.comments__form[data-id='${id}']`);     
  const showedForm = findShowedForm();
    
  if (showedForm) {
    hideForm(showedForm);
  } 
    
  (isShowedForm(form)) ? hideForm(form) : showForm(form);
}

function createElement(node) {
  if (typeof node === 'string') {
    return document.createTextNode(node);
  }
    
  const element = document.createElement(node.name);
  if ((node.props !== null) && (typeof node.props === 'object')) {
    Object.keys(node.props).forEach(i => element.setAttribute(i, node.props[i]));
  }
    
  if (node.childs instanceof Array) {
    node.childs.forEach(child => element.appendChild(createElement(child)));
  }
    
  return element;
}

// Создание Формы для комментариев
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
    
  const left = x - 22;
  const top = y - 14;
  const max = 1000, min = 50;
  const id = Math.floor(Math.random() * (max - min)) + min;
  	
  formComment.style.cssText = `
    top: ${top}px;
    left: ${left}px;
    z-index: 2;  
    id: ${id};
  `;	
  formComment.dataset.left = left;
  formComment.dataset.top = top;
  formComment.dataset.id = id;
  
  createMarker(x, y, id);
    
  const loaderComment = formComment.querySelector('.loader'); 
  hide(loaderComment.parentElement);     
    
  const btnClose = formComment.querySelector('.comments__close'); // Кнопка Закрыть    
  const checkboxMarker = formComment.querySelector('.comments__marker-checkbox'); // checkbox     
 
  //Разворачиваем форму
  checkboxMarker.checked = true; 
  formComment.style.display = 'block';   
        
  // Удалить пустую форму (или свернуть форму с комментариями, маркер - оставить)   
  const showedForm = findShowedForm();     
  if (showedForm) {      
    hideForm(showedForm); 
  }     
      
  // Удалить пустую форму по Кнопке Закрыть (или удалить пустую форму)
  btnClose.addEventListener('click', event => { 
    const showedForm = findShowedForm(); 
    if (showedForm) {
      hideForm(showedForm);
    }
  });
	
  // Клик по маркеру - Не сварачивать форму	
  checkboxMarker.addEventListener('click', () => { 
    checkboxMarker.checked = true;      
  });        
    
  //  Кнопка Отправить комментарий	    
  formComment.addEventListener('submit', formMessage);       
  function formMessage(event) {	
    event.preventDefault();      
    const message = formComment.querySelector('.comments__input').value;
    const formMessage = `message=${encodeURIComponent(message)}&left=${encodeURIComponent(left)}&top=${encodeURIComponent(top)}`;
	
    if (message) { 
        
      sendComments(formMessage);  // Отправить комментарий на сервер          
      show(loaderComment.parentElement);   
      formComment.querySelector('.comments__input').value = '';  // очистить поле    
        
    } else { 
        
      alert('Нужен комментарий!');   
      hide(loaderComment.parentElement); 
        
    } 
  }      
    
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
//        console.log('Комментарий отправлен: ', result);
        return result;
      }
      throw new Error (result.statusText);
    })
    .then(result => result.json())
    .catch(error => {
      console.log(`Ошибка при отправке комментария на сервер: ${error.message}`);
      hide(loaderComment.parentElement);  
    });
  }  
    
  return formComment; 	
    
}

// Добавление комментария в форму
function addMessageComment(message, time, form) {
  let parentLoaderDiv = form.querySelector('.loader').parentElement;  
    
  const newMessageDiv = document.createElement('div');
  newMessageDiv.classList.add('comment');
  newMessageDiv.dataset.timestamp = message.timestamp;
    
  const commentTimeP = document.createElement('p');
  commentTimeP.classList.add('comment__time');   
  const d = new Date(time);
  commentTimeP.textContent = `${formatData(d.getDate())}:${formatData(d.getMonth() + 1)}:${formatData(d.getFullYear())} ${formatData(d.getHours())}:${formatData(d.getMinutes())}:${formatData(d.getSeconds())}`;
  newMessageDiv.appendChild(commentTimeP);
    
  const commentMessageP = document.createElement('p');
  commentMessageP.classList.add('comment__message');
  commentMessageP.textContent = message.message;
  newMessageDiv.appendChild(commentMessageP);
	
  form.querySelector('.comments__body').insertBefore(newMessageDiv, parentLoaderDiv);

}

// Обновление форм с комментариями
let showComments = {};
function updateCommentForm(newComment) {       
  if (!newComment) { return; }
    
  Object.keys(newComment).forEach(id => {        
    if (id in showComments) { return; }       
    showComments[id] = newComment[id];       
    const appCommentsForm = app.querySelectorAll('.comments__form');	
      
    Array.from(appCommentsForm).forEach(form => {         
      if (+form.dataset.left === showComments[id].left && +form.dataset.top === showComments[id].top) {           
        form.querySelector('.loader').parentElement.style.display = 'none';  
        addMessageComment(newComment[id], showComments[id].timestamp, form); 
      }        
    });   
  });    
} 

// Вставка полученных с сервера комментариев
function insertWssCommentForm(wssComment) {
  const wsCommentEditor = {};
  wsCommentEditor[wssComment.id] = {};
  wsCommentEditor[wssComment.id].left = wssComment.left;
  wsCommentEditor[wssComment.id].message = wssComment.message;
  wsCommentEditor[wssComment.id].timestamp = wssComment.timestamp;
  wsCommentEditor[wssComment.id].top = wssComment.top;
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

// Отправка canvas на сервер
function sendMaskState() {
  canvas.toBlob(function (blob) {
    connection.send(blob);
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




