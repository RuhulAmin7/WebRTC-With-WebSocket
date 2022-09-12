// element selectors
const video = document.getElementById('video');
const muteBtn = document.getElementById('muteBtn');
const cameraBtn = document.getElementById('cameraOffBtn');
const selectCam = document.getElementById('selectCam');
const selectMic = document.getElementById('selectMic');

// global variables
let mute = false;
let camera = true;
let mediaStream;
let currentCam;
// get media devices
async function getMedia(cameraId, micId) {
  currentCam = cameraId === null? currentCam: cameraId;

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
    displayMedia();
    // invoke all cameras
    getAllCameras();
    // invoke all microphones
    getAllMic();
  } catch (error) {
    console.log(error);
  }
}

// invoke get media function
getMedia();

// display media
function displayMedia() {
  video.srcObject = mediaStream;
  // for more efficient and secure displayMedia
  video.addEventListener('loadmetadata', () => {
    video.play();
  });
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
