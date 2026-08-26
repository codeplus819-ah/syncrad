import { keys, values, del, clear, get, set } from './idb-keyval.js';

const socket = io(`https://${window.location.host}`);

let isReceivingFile = false;
let receivingFileInfo = {};
let receivedSize = 0;

function showNotif(title, description, ...btns) {
  console.log(1);
  
  const notif = document.querySelector('.notif');
  if (notif.classList.contains('hidden')) notif.classList.remove('hidden');
  document.querySelector('.notif .title').textContent = title;
  document.querySelector('.notif .description').textContent = description;
  const btnsBox = document.querySelector('.notif .btns');
  btnsBox.innerHTML = '';
  btns.forEach((btn)=>{
    btnsBox.innerHTML += `
      <button id='${btn.id}' class='${btn.class}'>${btn.text}</button>
    `;
    document.getElementById(btn.id).addEventListener('click', btn.callback);
  });
}

function hideNotif() {
  const notif = document.querySelector('.notif');
  if (!notif.classList.contains('hidden')) notif.classList.add('hidden');
}

function setSendFilePermision() {
  if (isReceivingFile == false) {
    document.querySelectorAll('.send').forEach(e=>{
      e.disabled = false;
      e.removeAttribute('disabled');
    });
    return;
  } else {
    document.querySelectorAll('.send').forEach(e=>{
      e.disabled = false;
      e.setAttribute('disabled', 'true');
    });
    return;
  }
}

function getCookieByName(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let c of ca) {
    while (c.charAt(0) === ' ') {
      c = c.substring(1, c.length);
    }
    if (c.indexOf(nameEQ) === 0) {
      return c.substring(nameEQ.length, c.length);
    }
  }
  return null;

}

let deviceId;

async function getInformations() {
  await fetch('/api/getUserInformation')
  .then(res=>res.json())
  .then(data=>{
    deviceId = data.device_id
    document.getElementById('username').append(String(data.username));
    document.getElementById('device').append(String(data.deviceName));
    document.getElementById('phone').append(String(data.phoneNumber));
  });
}

getInformations()

async function getFiles() {
  await fetch('/api/getFiles')
  .then(res=>res.json())
  .then(async data=>{
    if (data.redirect && data.redirect != "") {
      window.location.href = data.redirect;
    }
    if (data.fileLocations.length > 0) {
      document.querySelector('.files').innerHTML = "";
      for (const e of data.fileLocations) {
        const fileElement = `
        <div class="file" id="f${e.id}">
          <div class="filename">${e.file_name}</div>
          <input type="hidden" class="idb-key" value="${e.idb_key}">
          <div class="controls">
            ${!await get(e.idb_key) ? "<button class='btn btn-blue request'>&downarrow;</button>" : `<button class='btn btn-blue send'>&uparrow;</button>`}
            <!-- <button class="btn btn-red">&times;</button> -->
            <!-- <button class="btn btn-yellow">&#8635;</button> -->
          </div>
        </div>
        `;
        document.querySelector('.files').innerHTML += fileElement;
        if (document.querySelector(`#f${e.id} .send`)) {
          document.querySelector(`#f${e.id} .send`).addEventListener('click', ()=>sendFile(e.idb_key));
        }
        if (document.querySelector(`#f${e.id} .request`)) {
          document.querySelector(`#f${e.id} .request`).addEventListener('click', ()=>requestFile(e.idb_key));
        }
      }
    }
  })
  .catch(err=>{console.error(err)});
}

async function chooseFile() {
  const [fileHandle] = await window.showOpenFilePicker();
  console.log(fileHandle);
  await fileHandle.requestPermission({mode: 'readwrite'});
  console.log(typeof fileHandle);
  console.log(JSON.stringify(fileHandle));
  const file = await fileHandle.getFile();
  console.log(file);
  document.getElementById('fileName').textContent = file.name;
  const filename = document.getElementById('filename').value == "" ? file.name : document.getElementById('filename').value;
  await fetch('/api/addFile', {
    method: 'POST',
    body: JSON.stringify({ filename }),
    headers: { 'Content-Type': 'application/json' }
  })
  .then(res=>res.json())
  .then(async data=>{
    if (data.status == 'success') {
      set(data.idbKey, file);
      getFiles();
    }
  })
  .catch(err=>console.error(err));
}

document.getElementById('choose').addEventListener('click', chooseFile);

function readChunkAsArrayBuffer(chunk) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(chunk);
  });
}

async function requestFile(idbkey) {
  socket.emit('request:file', { idbkey })
}

async function sendFile(idbKey) {
  try {
    const file = await get(idbKey);
    const fileSize = file.size;
    const fileName = file.name;
    const chunkSize = 1024 * 64;

    socket.emit('sending:start', {
      fileName,
      fileSize,
      totalChunks: Math.ceil(fileSize / chunkSize)
    });
    document.getElementById('proccess-bar-notif').classList.remove('hidden');
    let offset = 0;
    let chunkIndex = 0;

    while (offset < fileSize) {
      const chunk = file.slice(offset, Math.min(offset + chunkSize, fileSize));
      const chunkData = await readChunkAsArrayBuffer(chunk);
      
      socket.emit('sending:chunk', {
        chunkIndex,
        totalChunks: Math.ceil(fileSize / chunkSize),
        chunkData,
        isLast: offset + chunkSize >= fileSize
      });

      offset += chunkSize;
      chunkIndex++;

      const progress = Math.min(100, (offset / fileSize) * 100);
      document.getElementById('procceed').style.width = `${progress.toFixed(2)}%`;
      document.getElementById('procceed').innerText = `${progress.toFixed(2)}%`;
    }

    socket.emit('sending:end', {
      fileName
    });
    setTimeout(()=>{
      document.getElementById('proccess-bar-notif').classList.add('hidden');
    }, 2500)
  } catch (error) {
    console.error(error);
    socket.emit('sending:error', { error: error.message });
  }
}

getFiles();
/*
socket.on('sending:start', (data)=>{
  receivingFileInfo = data;
  isReceivingFile = true;
  setSendFilePermision();
  console.log(1);
});

let chunks = [];

socket.on('sending:chunk', (data)=>{
  chunks.push(data.chunkData);
});

socket.on('sending:end', (data)=>{
  const blob = new Blob(chunks, { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = receivingFileInfo.fileName;
  document.body.appendChild(link);
  link.target = "blank";
  link.click();
  document.body.removeChild(link);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
});
*/
socket.on('sending:start', (data)=>{
  document.getElementById('proccess-bar-notif').classList.remove('hidden');
  receivingFileInfo = data;
  isReceivingFile = true;
  setSendFilePermision();
});

let chunks = [];

socket.on('sending:chunk', (data)=>{
  chunks.push(data.chunkData);
  receivedSize += data.chunkData.byteLength;
  const progress = Math.min(100, (receivedSize / receivingFileInfo.fileSize) * 100);

  document.getElementById('proccess-bar-notif').classList.remove('hidden');
  document.getElementById('procceed').style.width = `${progress.toFixed(2)}%`;
  document.getElementById('procceed').innerText = `${progress.toFixed(2)}%`;
});

socket.on('sending:end', (data) => {
  const blob = new Blob(chunks, { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  
  document.getElementById('procceed').style.width = '100%';
  document.getElementById('procceed').innerText = '100%';
  
  const downloadContainer = document.querySelector('#proccess-bar-notif .download-link');
  if (downloadContainer) {
    downloadContainer.innerHTML = '';
    const link = document.createElement('a');
    link.href = url;
    link.download = receivingFileInfo.fileName;
    link.className = 'btn btn-blue';
    link.innerText = 'download';
    downloadContainer.appendChild(link);
  }
  
  chunks = [];
  receivedSize = 0;
  isReceivingFile = false;
  setSendFilePermision();
  setTimeout(() => {
    document.getElementById('proccess-bar-notif').classList.add('hidden');
    if (downloadContainer) {
      downloadContainer.innerHTML = '';
    }
  }, 10000);
});

socket.on('request:file', async (msg)=>{
  const {idbkey, device, name} = msg;
  console.log(msg);
  console.log(await keys());
  const ikeys = await keys();
  if (ikeys.includes(idbkey)) {
    console.log(1);
    showNotif(`درخواست فایل ${name}`, `دستگاه ${device} شما درخواست فایلی را دارد،اجازه ارسال میدهید؟`, 
      { id: 'b-1', class: 'btn btn-red', callback: hideNotif, text: 'رد' },
      { id: 'b-2', class: 'btn btn-green', callback: ()=>{ hideNotif();sendFile(idbkey); }, text: 'تایید' },
    );
  }
});
