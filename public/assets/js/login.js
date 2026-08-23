async function login() {
  const recivedUsername = String(document.getElementById('username').value);
  const recivedPassword = String(document.getElementById('password').value);
  await fetch('/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({username: recivedUsername, password: recivedPassword})
  })
  .then(res=>res.json())
  .then(data=>{
    console.log(data);
    if (data.redirect == window.location.href) {
      document.querySelector('p.error').textContent = data.status;
    } else {
      window.location.href = data.redirect
    }
  })
  .catch(err=>console.error(err))
}

if (document.getElementById("login")) document.getElementById("login").addEventListener('click', login);

async function register() {
  const recivedUsername = String(document.getElementById('username').value);
  const recivedPassword = String(document.getElementById('password').value);
  const recivedFullName = String(document.getElementById('fullname').value);
  const recivedPhoneNumber = String(document.getElementById('phone-number').value);
  await fetch('/api/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({username: recivedUsername, password: recivedPassword, fullname: recivedFullName, phoneNumber: recivedPhoneNumber})
  })
  .then(res=>res.json())
  .then(data=>{
    if (data.redirect == window.location.href) {
      document.querySelector('p.error').textContent = data.status;
      console.log(data.redirect);
      console.log(window.location.href);
    } else {
      window.location.href = data.redirect
    }
  })
  .catch(err=>console.error(err))
}

async function getDevices() {
  await fetch('/api/getDevices')
  .then(res=>res.json())
  .then(data=>{
    document.getElementById('devices').innerHTML = "";
    const d = document.createElement('option');
    d.innerText = "نام دستگاه فعلی"
    document.getElementById('devices').appendChild(d);
    for (let index = 0; index < data.devices.length; index++) {
      const e = data.devices[index];

      const option = document.createElement('option');
      option.value = e.id;
      option.innerText = String(e.device_name);
      document.getElementById('devices').appendChild(option);
    }
  });
}

function finishLogin() {
  const selected = document.getElementById('devices').value;
  window.location.href = `/panel?device_id=${selected}`;
}

async function addDevice() {
  const deviceName = document.getElementById('device-name').value;
  const deviceType = document.getElementById('device-type').value;
  console.log(deviceName);
  console.log(deviceType);
  await fetch('/api/addNewDevice', {
    method: "POST",
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      devicename: deviceName,
      devicetype: deviceType
    })
  })
  .then(res=>res.json())
  .then(data=>{
    console.log(data);
    window.location.reload();
  });
}

if (document.getElementById("register")) document.getElementById("register").addEventListener('click', register)

function showAddDevice() {document.querySelector('.new-device').classList.toggle('show');}

if (document.getElementById("newBoxToggler")) document.getElementById("newBoxToggler").addEventListener('click', showAddDevice)
if (document.getElementById('newBoxToggler')) {
  getDevices();
  document.getElementById('addDevice').addEventListener('click', addDevice);
  document.getElementById('finish-login').addEventListener('click', finishLogin);
}
