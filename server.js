const { v4: uuidv4 } = require('uuid');

const express = require('express');
const app = express();
const http = require('http');
const expressServer = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(expressServer);

// middleware
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.get('/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  res.render('index', { roomId });
});
app.get('/', (req, res) => {
  res.redirect(`/${uuidv4()}`);
});

// socket connection
io.on('connection', (socket) => {
  console.log('New user connected');

  // joining a room
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    // notify the others about new user joined
    socket.to(roomId).emit('newJoining');
  });

  // send the offer
  socket.on('sendOffer', (offer, roomId) => {
    socket.to(roomId).emit('receiveOffer', offer);
  })

  // send the answer
  socket.on('sendAnswer', (answer, roomId) => {
    socket.to(roomId).emit('receiveAnswer', answer);
  })
  // send the ice candidate
  socket.on('sendIceCandidate', (candidate, roomId) => {
    socket.to(roomId).emit('receiveCandidate', candidate);
  })

});

expressServer.listen(4000, () => {
  console.log('Server is listening at http://localhost:4000');
});
