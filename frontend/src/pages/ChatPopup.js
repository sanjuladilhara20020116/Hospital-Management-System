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

const botAvatar = 'bot2.jpg';
const userAvatar = '17360409.png';

export default function ChatPopup({ onClose }) {
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! I am Medina. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const utteranceRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Get female voice
  const getFemaleVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    return voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('samantha')) ||
           voices.find(v => v.lang.startsWith('en'));
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = e => {
      setInput(e.results[0][0].transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;

    window.speechSynthesis.onvoiceschanged = () => getFemaleVoice(); // preload voices
  }, []);

  const speakText = (text) => {
    window.speechSynthesis.cancel(); // Stop any current speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.voice = getFemaleVoice();

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const pauseSpeaking = () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const resumeSpeaking = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !listening) {
      setListening(true);
      recognitionRef.current.start();
    }
  };

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
      } else {
        setMessages(prev => [...prev, { from: 'bot', text: "Sorry, I didn't get that." }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { from: 'bot', text: "Sorry, something went wrong." }]);
    }
  };

  return (
    <Paper elevation={6} sx={{
      position: 'fixed', bottom: 72, right: 16,
      width: 500, height: 650, display: 'flex', flexDirection: 'column',
      zIndex: 1200, borderRadius: 2, overflow: 'hidden', bgcolor: 'background.paper'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6">🤖 Medina AI</Typography>
        <IconButton size="small" onClick={() => { stopSpeaking(); onClose(); }} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
        {messages.map((msg, i) => (
          <Stack key={i} direction="row" spacing={1} alignItems="flex-start" mb={1} justifyContent={msg.from === 'user' ? 'flex-end' : 'flex-start'}>
            {msg.from === 'bot' && <Avatar src={botAvatar} alt="Bot" />}
            <Box sx={{
              bgcolor: msg.from === 'bot' ? 'grey.300' : 'primary.main',
              color: msg.from === 'bot' ? 'black' : 'white',
              borderRadius: 2, p: 1.5, maxWidth: '70%',
              whiteSpace: 'pre-wrap', fontSize: 14
            }}>
              {msg.text}
            </Box>
            {msg.from === 'user' && <Avatar src={userAvatar} alt="User" />}
          </Stack>
        ))}
      </Box>

      <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
        <IconButton onClick={startListening} color={listening ? 'primary' : 'default'}>
          <MicIcon />
        </IconButton>
        <TextField
          fullWidth size="small" placeholder="Type your message..." value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
          sx={{ mx: 1 }}
        />
        <Button variant="contained" endIcon={<SendIcon />} onClick={sendMessage} disabled={!input.trim()}>
          Send
        </Button>
      </Box>

      <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-around' }}>
        <Button onClick={() => speakText(messages[messages.length - 1]?.text)} disabled={isSpeaking} startIcon={<PlayArrowIcon />}>Play</Button>
        <Button onClick={pauseSpeaking} disabled={!isSpeaking || isPaused} startIcon={<PauseIcon />}>Pause</Button>
        <Button onClick={resumeSpeaking} disabled={!isPaused} startIcon={<PlayArrowIcon />}>Resume</Button>
        <Button onClick={stopSpeaking} disabled={!isSpeaking && !isPaused} startIcon={<StopIcon />}>Stop</Button>
      </Box>
    </Paper>
  );
}
