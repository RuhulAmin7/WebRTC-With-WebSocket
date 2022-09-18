// element selectors
const displayArea = document.getElementById('display_area');
// const video = document.getElementById('video');
const muteBtn = document.getElementById('muteBtn');
const cameraBtn = document.getElementById('cameraOffBtn');
const selectCam = document.getElementById('selectCam');
const selectMic = document.getElementById('selectMic');
const screenShareBtn = document.getElementById('screenShare');

// socket init
const socket = io();

// global variables
let mute = false;
let camera = true;
let mediaStream;
let currentCam;
let RTC;
let myVideoId;
let dataChannel;

// get media devices
async function getMedia(cameraId, micId) {
  currentCam = cameraId === null ? currentCam : cameraId;
  const initialConstraints = {
    video: true,
    audio: true,
  };
  const preferredCameraConstraints = {
    video: {
      deviceId: cameraId,
    },
    audio: true,
  };
  const videoOption = cameraId ? { deviceId: cameraId } : true;
  const preferredMicConstraints = {
    video: videoOption,
    audio: {
      deviceId: micId,
    },
  };

  try {
    mediaStream = await window.navigator.mediaDevices.getUserMedia(
      cameraId || micId
        ? cameraId
          ? preferredCameraConstraints
          : preferredMicConstraints
        : initialConstraints
    );
    if (!(cameraId || micId)) {
      displayMedia(mediaStream, true);
      // invoke all cameras
      getAllCameras();
      // invoke all microphones
      getAllMic();
      // invoke make RTCPeerConnection
      makeRTCPeerConnection();
      // socket joining room event
      socket.emit('joinRoom', roomId);
    } else {
      const myVideoEl = document.getElementById(myVideoId);
      myVideoEl.srcObject = mediaStream;
      // add track
      const videoTrack = mediaStream.getVideoTracks()[0];
      const audioTrack = mediaStream.getAudioTracks()[0];

      if (RTC) {
        const senders = RTC.getSenders();
        if (cameraId) {
          const videoSender = senders.find(
            (sender) => sender.track.kind === 'video'
          );
          videoSender.replaceTrack(videoTrack);
        }
        if (micId) {
          const audioSender = senders.find(
            (sender) => sender.track.kind === 'audio'
          );
          audioSender.replaceTrack(audioTrack);
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
}

// invoke get media function
getMedia();

// display media
function displayMedia(stream, selfMedia) {
  const video = document.createElement('video');

  if (selfMedia) {
    myVideoId = stream.id;
    video.muted = true;
  }

  video.id = stream.id;
  video.width = '320';
  video.height = '240';
  video.classList.add('me-3');
  video.srcObject = mediaStream;
  // for more efficient and secure displayMedia
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });
  displayArea.appendChild(video);
}

// mute and unmute functionality
muteBtn.addEventListener('click', () => {
  if (mute) {
    mute = false;
    muteBtn.textContent = 'Mute';
    mediaStream.getAudioTracks().forEach((track) => {
      track.enabled = true;
      //   console.log(track);
    });
  } else {
    mute = true;
    muteBtn.textContent = 'Unmute';
    mediaStream.getAudioTracks().forEach((track) => {
      track.enabled = false;
      //   console.log(track);
    });
  }
});

// camera off/on functionality
cameraBtn.addEventListener('click', () => {
  if (camera) {
    cameraBtn.textContent = 'Turn off camera';
    camera = false;
    mediaStream.getVideoTracks().forEach((track) => {
      track.enabled = false;
      // console.log(track);
    });
  } else {
    cameraBtn.textContent = 'Turn on camera';
    camera = true;
    mediaStream.getVideoTracks().forEach((track) => {
      track.enabled = true;
      // console.log(track);
    });
  }
});

// get all camera devices
async function getAllCameras() {
  const currentCamera = mediaStream.getVideoTracks()[0];
  selectCam.innerHTML = '';
  try {
    const devices = await window.navigator.mediaDevices.enumerateDevices();
    devices.forEach((device) => {
      if (device.kind === 'videoinput') {
        const option = document.createElement('option');
        option.textContent = device.label;
        option.value = device.deviceId;
        selectCam.appendChild(option);
        option.selected = currentCamera.label === device.label ? true : false;
      }
    });
  } catch (error) {
    console.log(error);
  }
}

// get all microphone devices
async function getAllMic() {
  const currentMic = mediaStream.getAudioTracks()[0];
  selectMic.innerHTML = '';
  try {
    const devices = await window.navigator.mediaDevices.enumerateDevices();
    devices.forEach((device) => {
      if (device.kind === 'audioinput') {
        const option = document.createElement('option');
        option.textContent = device.label;
        option.value = device.deviceId;
        selectMic.appendChild(option);
        option.selected = currentMic.label === device.label ? true : false;
      }
    });
  } catch (error) {
    console.log(error);
  }
}

// select specific camera
selectCam.addEventListener('input', () => {
  const cameraId = selectCam.value;
  getMedia(cameraId);
});
// select specific mic
selectMic.addEventListener('input', () => {
  const micId = selectMic.value;
  getMedia(null, micId);
});

// get screen media
async function getScreenMedia() {
  try {
    mediaStream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    });
    const micTrack = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    mediaStream.addTrack(micTrack.getAudioTracks()[0], micTrack);
    const myVideoEl = document.getElementById(myVideoId);
    myVideoEl.srcObject = mediaStream;
    const videoTrack = mediaStream.getVideoTracks()[0];
    const systemAudioTrack = mediaStream.getAudioTracks().find((track) => {
      return track.label === 'System Audio';
    });
    const micAudioTrack = mediaStream.getAudioTracks().find((track) => {
      return track.label !== 'System Audio';
    });

    if (systemAudioTrack) {
      RTC.addTrack(systemAudioTrack, mediaStream);
    }

    const senders = RTC.getSenders();
    const videoSender = senders.find((sender) => sender.track.kind === 'video');
    videoSender.replaceTrack(videoTrack);
    const audioSenders = senders.filter(
      (sender) => sender.track.kind === 'audio'
    );
    videoSender.replaceTrack(videoTrack);

    if (systemAudioTrack) {
      audioSenders[0].replaceTrack(systemAudioTrack);
      audioSenders[1].replaceTrack(micAudioTrack);
    } else {
      audioSenders[0].replaceTrack(micAudioTrack);
    }
  } catch (error) {
    console.log(error);
  }
}

screenShareBtn.addEventListener('click', getScreenMedia);

// socket
socket.on('newJoining', (data) => {
  makeOffer();
});

let configuration = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302',
    },
    {
      urls: 'stun:0.peerjs.com:3478',
      username: 'peerjs',
      credential: 'peerjsp',
    },
  ],
  sdpSemantic: 'unified-plan',
};

function makeRTCPeerConnection() {
  //rtc init
  RTC = new RTCPeerConnection(configuration);
  // add track
  const tracks = mediaStream.getTracks();
  tracks.forEach((track) => {
    RTC.addTrack(track, mediaStream);
  });

  // send ICE candidate
  RTC.addEventListener('icecandidate', (data) => {
    socket.emit('sendIceCandidate', data.candidate, roomId);
  });
  // add stream
  RTC.addEventListener('addstream', (data) => {
    displayMedia(data.stream);
  });
}

/*
1. Create a new RTC peer connection
2. get media stream
3. add track

*/

//make a offer
async function makeOffer() {
  console.log('hh')
  dataChannel = RTC.createDataChannel('chat');
  dataChannel.addEventListener('open', () => {
    dataChannel.addEventListener('message', (e) => {
      console.log('fired');
      const ul = document.querySelector('#display_message ul');
      const li = document.createElement('li');
      li.innerText = 'Someone: ' + e.data;
      ul.appendChild(li);
    });
  });

  const offer = await RTC.createOffer();
  RTC.setLocalDescription(offer);
  // send the offer
  socket.emit('sendOffer', offer, roomId);
}

// receive the offer
socket.on('receiveOffer', async (offer) => {
  RTC.addEventListener('datachannel', (e) => {
    dataChannel = e.channel;
    dataChannel.addEventListener('message', (e) => {
      const ul = document.querySelector('#display_message ul');
      const li = document.createElement('li');
      li.textContent = 'Someonee: ' + e.data;
      ul.appendChild(li);
    });
  });
  RTC.setRemoteDescription(offer);
  const answer = await RTC.createAnswer();
  RTC.setLocalDescription(answer);
  // send the answer
  socket.emit('sendAnswer', answer, roomId);
});

// receive the answer
socket.on('receiveAnswer', async (answer) => {
  RTC.setRemoteDescription(answer);
});

// receive the candidate
socket.on('receiveCandidate', (candidate) => {
  RTC.addICECandidate(candidate);
});

// message form handling
const msgForm = document.getElementById('msg_form');
msgForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const msgBox = document.getElementById('chat_input');
  const msg = document.getElementById('chat_input').value;
  const ul = document.querySelector('#display_message ul');
  const li = document.createElement('li');
  li.textContent = 'You: ' + msg;
  ul.appendChild(li);
   dataChannel.send(msg)
  msgBox.value = '';
});
