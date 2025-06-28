// src/pages/ChatPopup.js
import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, IconButton, TextField, Button, Paper, Avatar, Stack
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

const botAvatar = 'bot2.jpg'; // bot icon image URL
const userAvatar = '17360409.png'; // user icon image URL

export default function ChatPopup({ onClose }) {
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! I am Medina. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef(null);

  // Setup speech recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
    };
    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  // Text-to-speech function
  const speakText = (text) => {
    if (!window.speechSynthesis) {
      alert('Speech synthesis not supported');
      return;
    }
    window.speechSynthesis.cancel(); // cancel any existing speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    // Female voice preference:
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(voice => voice.lang.startsWith('en') && voice.name.toLowerCase().includes('female'))
      || voices.find(voice => voice.lang.startsWith('en'));
    if (femaleVoice) utterance.voice = femaleVoice;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const pauseSpeaking = () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
    }
  };

  const resumeSpeaking = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !listening) {
      setListening(true);
      recognitionRef.current.start();
    }
  };

  // Send user message and get bot reply
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { from: 'user', text: userMessage }]);
    setInput('');

    try {
      const res = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { from: 'bot', text: data.reply }]);
       // speakText(data.reply);
      } else {
        setMessages(prev => [...prev, { from: 'bot', text: "Sorry, I didn't get that." }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { from: 'bot', text: "Sorry, something went wrong." }]);
      console.error(err);
    }
  };

  return (
    <Paper elevation={6} sx={{
      position: 'fixed',
      bottom: 72,
      right: 16,
      width: 600,
      height: 850,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1200,
      borderRadius: 2,
      overflow: 'hidden',
      bgcolor: 'background.paper',
    }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6">🤖  Medina AI </Typography>
        <IconButton size="small" onClick={() => {
          stopSpeaking();
          onClose();
        }} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Messages list */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
        {messages.map((msg, i) => (
          <Stack key={i} direction="row" spacing={1} alignItems="flex-start" mb={1} justifyContent={msg.from === 'user' ? 'flex-end' : 'flex-start'}>
            {msg.from === 'bot' && <Avatar alt="Bot" src={botAvatar} />}
            <Box
              sx={{
                bgcolor: msg.from === 'bot' ? 'grey.300' : 'primary.main',
                color: msg.from === 'bot' ? 'black' : 'white',
                borderRadius: 2,
                p: 1.5,
                maxWidth: '70%',
                whiteSpace: 'pre-wrap',
                fontSize: 14,
              }}
            >
              {msg.text}
            </Box>
            {msg.from === 'user' && <Avatar alt="User" src={userAvatar} />}
          </Stack>
        ))}
      </Box>

      {/* Controls */}
      <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
        <IconButton onClick={startListening} color={listening ? 'primary' : 'default'} title="Speak">
          <MicIcon />
        </IconButton>

        <TextField
          variant="outlined"
          size="small"
          placeholder="Type your message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
          sx={{ flexGrow: 1, mx: 1 }}
        />

        <Button variant="contained" onClick={sendMessage} disabled={!input.trim()} endIcon={<SendIcon />}>
          Send
        </Button>
      </Box>

      {/* Speech Controls */}
      <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-around' }}>
        <Button onClick={() => speakText(messages[messages.length - 1]?.text)} disabled={speaking} size="small" startIcon={<PlayArrowIcon />}>
          Play
        </Button>
        <Button onClick={pauseSpeaking} size="small" disabled={!speaking}>
          Pause
        </Button>
        <Button onClick={resumeSpeaking} size="small" disabled={!speaking}>
          Resume
        </Button>
        <Button onClick={stopSpeaking} size="small" disabled={!speaking} startIcon={<StopIcon />}>
          Stop
        </Button>
      </Box>
    </Paper>
  );
}
