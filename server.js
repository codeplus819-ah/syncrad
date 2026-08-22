const http = require('http');
const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const app = express();
const server = http.createServer(app);
const path = require('path');
const cors = require('cors');
const pool = require('./db');
const socketio = require('socket.io');
const helmet = require('helmet');
const cookie = require('cookie');
const cookieParser = require('cookie-parser');
const configLoader = require('./configLoader')

app.use(cors());
// app.use(helmet());
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
        },
    },
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

const configs = configLoader();
const port = configs.port;

const io = new socketio.Server(server, {
  cors: {
    origin: "*",
  }
});

app.get('/', (req, res)=>{
  return res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

app.get('/register', (req, res)=>{
  if (!req.cookies.session && !req.cookies.mainSession) {
    return res.sendFile(path.join(__dirname, 'public', 'register.html'));
  } else {
    return res.redirect('/choose-device');
  }
});

app.post('/api/register', async (req, res)=>{
  const {username, password, fullname, phoneNumber} = req.body;
  if (username && password && fullname && phoneNumber && username != "" && password != "" && fullname != "" && phoneNumber != "") {
    const [rows] = await pool.query("SELECT * FROM `users` WHERE `username`=?", [username,]);
    if (!rows || rows.length == 0) {
      const password_hash = await bcrypt.hash(password, 10);
      const result = await pool.query("INSERT INTO `users`(`username`, `password`, `phone_number`, `full_name`) VALUES (?,?,?,?)", [username, password_hash, phoneNumber, fullname]);
      if (result) {
        const [users] = await pool.query("SELECT * FROM `users` WHERE `username`=?", [username,]);
        const token = await crypto.randomBytes(32).toString('hex');
        const userId = users[0].id;
        const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress).replace('::ffff:', '');
        await pool.query("INSERT INTO `tokens`(`user_id`, `device_id`, `for_what`, `value`, `ip`, `expires_at`) VALUES (?,?,?,?,?,DATE_ADD(NOW(), INTERVAL 15 MINUTE))", [userId, 0, 'login', token, ip]);
        res.cookie('session', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 1000*60*15
        }
        );
        res.status(200).json({status: 'ثبت نام موفق بود.', redirect: `http://${req.headers.host}/choose-device`});
      } else {
        res.status(501).json({status: 'خطا در ارتباط با سرور،لطفا مجدد تلاش نمایید', redirect: `http://${req.headers.host}/register`});
      }
    } else {
      res.status(401).json({status: 'این نام کاربری موجود می باشد.', redirect: `http://${req.headers.host}/register`});
    }
  }
});


app.get('/login', (req, res) => {
  if (!req.cookies.session && !req.cookies.mainSession) {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
    return
  } else {
    res.redirect('./choose-device');
    return
  }
});

app.post('/api/login', async (req, res)=>{
  const {username, password} = req.body;
  if (username && password) {
    const [rows] = await pool.query("SELECT * FROM `users` WHERE `username`=?", [username])
    if (rows && rows.length > 0) {
      const user = rows[0];
      const match = await bcrypt.compare(password, user['password']);
      if (!match) {
        return res.status(200).json({ status: "رمز عبور نا درست است.", redirect: `http://${req.headers.host}/login` })
      } else {
        const token = await crypto.randomBytes(32).toString('hex');
        const userId = user.id;
        const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress).replace('::ffff:', '');
        const deleted = await pool.query("DELETE FROM `tokens` WHERE `user_id` = ? AND `expires_at`<NOW()", [userId]);
        if (deleted) {
          const added = await pool.query("INSERT INTO `tokens`(`user_id`, `device_id`, `expires_at`, `for_what`, `value`, `ip`) VALUES (?,?,DATE_ADD(NOW(), INTERVAL 15 MINUTE),?,?,?)", [userId, 0, 'login', token, ip]);
          if (added) {
            res.cookie('session', token, {
              httpOnly: true,
              secure: true,
              sameSite: 'strict',
              maxAge: 1000*60*15
            });
            return res.status(200).json({ status: "success", redirect: `http://${req.headers.host}/choose-device`});
          } else {
            return res.status(401).json({ status: "خطا در ارتباط با سرور.", redirect: `http://${req.headers.host}/login` });
          }
        } else {
          return res.status(401).json({ status: "خطا در ارتباط با سرور.", redirect: `http://${req.headers.host}/login` });
        }
      }
    } else {
      return res.status(401).json({ status: "نام کاربری نا درست است.", redirect: `http://${req.headers.host}/login` });
    }
  }
});

app.get('/choose-device', async (req, res)=>{
  if (req.cookies && req.cookies.session) {
    const [users] = await pool.query("SELECT * FROM `tokens` WHERE `value`=?", [req.cookies.session,]);
    if (users && users.length > 0) {
      const user = users[0];
      const userId = user.user_id;
      const token = await crypto.randomBytes(32).toString('hex');
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress).replace('::ffff:', '');
      const deleted = await pool.query("DELETE FROM `tokens` WHERE `user_id` = ? AND `expires_at`<NOW()", [userId]);
      if (deleted) {
        const added = await pool.query("INSERT INTO `tokens`(`user_id`, `device_id`, `expires_at`, `for_what`, `value`, `ip`) VALUES (?,?,DATE_ADD(NOW(), INTERVAL 60 MINUTE),?,?,?)", [userId, 0, 'complete-login', token, ip]);
        if (added) {
          res.cookie('mainSession', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 1000*60*60,
            path: '/'
          });
          res.status(200).sendFile(path.join(__dirname, 'public', 'chooseDevice.html'));
        } else {
          res.send("خطا در اتباط با سرور");
        }
      } else {
          res.send("خطا در اتباط با سرور");
      }
    } else {
    res.redirect('/login');
    }
  } else {
    res.redirect('/login');
  }
});

app.get('/api/getDevices', async (req, res)=>{
  if (req.cookies && req.cookies.session) {
    const token = req.cookies.session;
    const [rows] = await pool.query("SELECT * FROM `tokens` WHERE `for_what`=? AND `value`=? ORDER BY `id` DESC LIMIT 1", ['login', token]);
    if (rows && rows.length > 0) {
      const userId = rows[0]['user_id'];
      const [results] = await pool.query("SELECT `id`, `device_name` FROM `devices` WHERE `user_id`=?", [userId,])
      if (results && results.length > 0) {
        res.status(200).json({status: 'گرفتن دستگاه ها موفق بود', devices: results});
      } else {
        res.status(200).json({status: "دستگاهی یافت نشد!", devices: {}})
      }
    }
  }
});

app.post('/api/addNewDevice', async (req, res)=>{
  if (req.cookies && req.cookies.session) {
    const {devicename, devicetype} = req.body;
    if (devicename && devicetype && devicename != "" && devicetype != "") {
      const token = req.cookies.session;
      const [rows] = await pool.query("SELECT * FROM `tokens` WHERE `for_what`=? AND `value`=? ORDER BY `id` DESC LIMIT 1", ['login', token]);
      if (rows && rows.length > 0) {
        const userId = rows[0]['user_id'];
        const [results] = await pool.query("SELECT * FROM `devices` WHERE user_id=? AND device_name=?", [userId, devicename]);
        if (!results && results.length == 0) {
          res.status(304).json({status: 'نام دستگاه تکراریست'});
          return;
        } else {
          const result = await pool.query("INSERT INTO `devices`(`user_id`, `device_name`, `device_type`) VALUES (?,?,?);", [userId, devicename, devicetype]);
          if (result) {
            res.status(200).json({status: 'ثبت دستگاه موفق بود!'});
          } else {
            res.status(500).json({status: 'خطا در ثبت دستگاه'});
          }
          return;
        }
      } else {
        res.status(401).json({status: 'توکن منقضی شده است.'});
      } 
    } else {
      res.status(401).json({status: 'داده ها نامعتبرند!'});
    }
  } else {
    res.status(401).json({status: 'کوکی منقضی شده است.'});
  }
})

app.get('/panel', async (req, res)=>{
  const {device_id,} = req.query;
  if (isFinite(device_id) && req.cookies && req.cookies.mainSession) {
    const token = req.cookies.mainSession;
    const [rows1] = await pool.query("SELECT * FROM `devices` WHERE `id`=?", [device_id,]);
    const [rows2] = await pool.query("SELECT * FROM `tokens` WHERE `value`=? AND `for_what`='complete-login'", [token,]);
    if (rows1 && rows1.length > 0 && rows2 && rows2.length > 0) {
      const updated = await pool.query("UPDATE `tokens` SET `device_id`=? WHERE `value`=?", [device_id, token]);
      if (updated) {
        res.sendFile(path.join(__dirname, 'public', 'panel.html'))
      } else {
        res.send("خطا در ارتباط با سرور")
      }
    } else {
      res.redirect('/login');
    }
  } else {
    res.status(400).redirect('/login');
  }
});

app.get('/api/getUserInformation', async (req, res)=>{
  if (req.cookies && req.cookies.mainSession) {
    const token = req.cookies.mainSession;
    const [tokens] = await pool.query("SELECT * FROM `tokens` WHERE `value`=? AND `expires_at`>NOW()",[token]);
    if (tokens && tokens.length > 0) {
      const [users] = await pool.query("SELECT * FROM `users` WHERE `id`=?", [tokens[0].user_id]);
      const username = users[0].username;
      const phone = users[0].phone_number;
      const [devices] = await pool.query("SELECT * FROM `devices` WHERE id=?", [tokens[0].device_id]);
      return res.status(200).json({username: username, phoneNumber: phone, deviceName:devices[0].device_name, deviceId: tokens[0].device_id});
    }
  }
});

app.get('/api/getFiles', async (req, res)=>{
  if (req.cookies && req.cookies.mainSession) {
    const token = req.cookies.mainSession;
    const [rows] = await pool.query("SELECT * FROM `tokens` WHERE `value`=? AND `for_what`='complete-login' AND `expires_at`>NOW() ORDER BY `id` DESC LIMIT 1", [token,]);
    if (rows && rows.length > 0) {
      const [files] = await pool.query("SELECT * FROM `file_locations` WHERE `user_id`=?", [rows[0].user_id,]);
      if (files && files.length > 0) {
        return res.json({status: 'success', fileLocations: files});
      } else {
        return res.json({status: 'success', fileLocations: []});
      }
    } else {
      res.status(401).json({status: 'توکن منقضی شده است', redirect: '/login?m=توکن منقضی شده است'})
    }
  } else {
    res.status(401).json({status: 'توکن منقضی شده است', redirect: '/login?m=توکن منقضی شده است'})
  }
});

app.post('/api/addFile', async (req, res)=>{
  if (req.cookies?.mainSession) {
    const token = req.cookies.mainSession;
    const [rows] = await pool.query("SELECT * FROM `tokens` WHERE `value`=? AND `for_what`='complete-login' AND `expires_at`>NOW() ORDER BY `id` DESC LIMIT 1", [token,]);
    if (rows && rows.length > 0) {
      const { filename } = req.body;
      if (filename && filename.trim() != "") {
        const idbKey = crypto.randomBytes(32).toString('hex');
        const result = await pool.query("INSERT INTO `file_locations`(`user_id`, `device_id`, `file_name`, `idb_key`) VALUES (?, ?, ?, ?)" , [rows[0].user_id, rows[0].device_id, filename, idbKey]);
        if (result) {
          return res.status(200).json({ status: 'success', idbKey })
        }
        return res.status(401).json({status: 'خطا در ارتباط با دیتابیس', redirect: `/panel?device_id=${rows[0].device_id}`})
      } else {
        return res.status(401).json({status: 'ورودی نامعتبر است', redirect: `/panel?device_id=${rows[0].device_id}`})
      }
    } else {
      return res.status(401).json({status: 'توکن منقضی شده است', redirect: '/login?m=توکن منقضی شده است'})
    }
    return;
  }
  res.status(401).json({status: 'توکن منقضی شده است', redirect: '/login?m=توکن منقضی شده است'})
});

app.get('/test', (req, res)=>{
  res.send('test')
});

io.on('connection', async (socket)=>{
  const cookieHeader = socket.handshake.headers.cookie;
  if (!cookieHeader) { return socket.disconnect(); }
  const cookies = cookie.parseCookie(cookieHeader);
  const token = cookies.mainSession;
  const [rows] = await pool.query("SELECT * FROM `tokens` WHERE `value`=? AND `expires_at`>NOW();", [String(token),]);
  if (rows && rows.length > 0) {
    const user_id = rows[0].user_id;
    const device_id = rows[0].device_id;
    const added = await pool.query("INSERT INTO `socket_connections`(`user_id`, `device_id`, `socket_id`) VALUES (?,?,?)", [user_id, device_id, socket.id]);
    if (added) {
      socket.joinedRoom = user_id;
      socket.join(user_id);
    } else {
      socket.send("Can`t connect to db");
    }
  } else {
    socket.send("user not found");
  }
  socket.on("sending:start", (data)=>{
    socket.to(socket.joinedRoom).emit('sending:start', data);
  })

  socket.on('sending:chunk', (data) => {
    socket.to(socket.joinedRoom).emit('sending:chunk', data)
  });

  socket.on('sending:end', (data) => {
    socket.to(socket.joinedRoom).emit('sending:end', data);
  });

  socket.on('sending:error', (error) => {
    socket.to(socket.joinedRoom).emit('sending:error', error);
  });

  socket.on("disconnect", async ()=>{
    await pool.query("DELETE FROM `socket_connections` WHERE `socket_id`=?", [socket.id]);
  });
});

server.listen(port, '0.0.0.0', ()=>{
  console.log(`server is running on port ${port}`);
});
