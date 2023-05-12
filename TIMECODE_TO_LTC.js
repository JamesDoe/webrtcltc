//https://stackoverflow.com/questions/34110725/convert-number-to-tens-hundreds-thousands
function separateNumberIntoUnits(n) {
  if (n == 0) return [0];
  // n = Math.floor(n); // needed for decimal numbers
  var arr = [];
  var i = 1;

  while (n > 0) {
    arr.unshift((n % 10) * i);
    n = Math.floor(n / 10);
    i *= 10
  }

  return arr;
}

function TIMECODE_TO_LTC(object) {
    let user_bits = "0000", data_frame, frame = separateNumberIntoUnits(object.frame);
    let frame_number_units = Number(frame.at(-1)).toString(2).padStart(4,"0").split("").reverse().join("");
    data_frame = frame_number_units + user_bits;
    let frame_number_tens = Number(frame.at(-2)?frame.at(-2)/10:0).toString(2).padStart(2,"0").split("").reverse().join("");
    data_frame += frame_number_tens;
    let drop_frame_flag = "0";
    let color_scheme_flag = "0";
    data_frame += (drop_frame_flag + color_scheme_flag +  user_bits);
    let seconds = separateNumberIntoUnits(object.second);
    let seconds_units = Number(seconds.at(-1)).toString(2).padStart(4,"0").split("").reverse().join("");
    console.log({seconds, seconds_units})
    data_frame += seconds_units + user_bits;
    let seconds_tens = Number(seconds.at(-2)?seconds.at(-2)/10:0).toString(2).padStart(3,"0").split("").reverse().join("");
    data_frame += seconds_tens;
    let polarity_correction_bit = "1";
    data_frame += polarity_correction_bit + user_bits;
    let minutes = separateNumberIntoUnits(object.minute);
    let minutes_units = Number(minutes.at(-1)).toString(2).padStart(4,"0").split("").reverse().join("");
    console.log({minutes})
    data_frame += minutes_units + user_bits;
    let minutes_tens = Number(minutes.at(-2)?minutes.at(-2)/10:0).toString(2).padStart(3,"0").split("").reverse().join("");
    data_frame += minutes_tens;
    let BGF0 = "0";
    data_frame += BGF0 + user_bits;
     let hours = separateNumberIntoUnits(object.hour);
    let hours_units = Number(hours.at(-1)).toString(2).padStart(4,"0").split("").reverse().join("");
    console.log({hours})
    data_frame += hours_units + user_bits;
    let hours_tens = Number(hours.at(-2)?hours.at(-2)/10:0).toString(2).padStart(2,"0").split("").reverse().join("");
    data_frame += hours_tens;
    let BGF1 = "0", BGF2 = "0", sync_pattern ="0011111111111101";
    data_frame += BGF1 + BGF2 + user_bits + sync_pattern;
    console.log(data_frame.length);
}

TIMECODE_TO_LTC({frame:8, second: 9, minute: 10, hour: 11});

function createLTCAudioBuffer(duration, frameRate) {
  const frameDuration = 1 / frameRate;
  const numFrames = Math.floor(duration * frameRate);
  const bitsPerFrame = 80;
  const bitDuration = frameDuration / bitsPerFrame;
  const sampleRate = 48000;
  const numSamples = Math.floor(duration * sampleRate);
  const buffer = new Float32Array(numSamples);

  let frameCount = 0;
  let bitCount = 0;

  for (let i = 0; i < numSamples; i++) {
    if (bitCount === 0) {
      const frame = generateBinaryLTCFrame({
        frame: frameCount % 30,
        second: Math.floor(frameCount / 30) % 60,
        minute: Math.floor(frameCount / (30 * 60)) % 60,
        hour: Math.floor(frameCount / (30 * 60 * 60)) % 24
      });
      const waveform = createLTCWaveform(frame, bitDuration, sampleRate);
      bitCount = waveform.length;
    }

    buffer[i] = waveform[waveform.length - bitCount];
    bitCount--;
    if (bitCount === 0) {
      frameCount++;
    }
  }

  const audioCtx = new AudioContext();
  const audioBuffer = audioCtx.createBuffer(1, buffer.length, sampleRate);
  const channelData = audioBuffer.getChannelData(0);
  for (let i = 0; i < buffer.length; i++) {
    channelData[i] = buffer[i];
  }
  
  return audioBuffer;
}

function createLTCWaveform(frame, bitDuration, sampleRate) {
  const bitWidth = Math.floor(sampleRate * bitDuration);
  const waveform = new Float32Array(bitWidth * 80);

  let index = 0;
  for (let i = 0; i < 80; i++) {
    const bit = (frame >> (79 - i)) & 1;
    const frequency = bit ? LTC_FREQUENCY_1 : LTC_FREQUENCY_0;

    for (let j = 0; j < bitWidth; j++) {
      const time = (index / sampleRate);
      waveform[index] = Math.sin(2 * Math.PI * frequency * time);
      index++;
    }
  }

  return waveform;
}

//{"high":,"low":}

[
  {
    "frame_rate": "24",
    "bit_length_ms": 41.67,
    "bin1": {"high":21.67,"low":20},
    "bin0": {"high":12.5,"low":29.17}
  },
  {
    "frame_rate": "25",
    "bit_length_ms": 40,
    "bin1": {"high":20,"low":20},
    "bin0": {"high":12,"low":28}
  },
  {
    "frame_rate": "29.97",
    "bit_length_ms": 33.3667,
    "bin1": {"high":16.67,"low":16.967},//"High for 16.67ms, low for 16.6967ms",
    "bin0": {"high":9.24,"low":24.1267}//"High for 9.24ms, low for 24.1267ms"
  },
  {
    "frame_rate": "30",
    "bit_length_ms": 33.33,
    "bin1": {"high":16.67,"low":16.66},//"High for 16.67ms, low for 16.66ms"
    "bin0": {"high":9.17,"low":24.16}//"High for 9.17ms, low for 24.16ms"
  }
]
