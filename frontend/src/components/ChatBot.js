
import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper } from '@mui/material';
import axios from 'axios';

export default function ChatBot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const res = await axios.post('http://localhost:5000/api/chat', {
        message: input,
      });

      const botReply = {
        role: 'assistant',
        content: res.data.reply,
      };

      setMessages(prev => [...prev, botReply]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '⚠️ Unable to reach the chatbot.' },
      ]);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 4 }}>
      <Typography variant="h6">🤖 Ask the Hospital Assistant</Typography>
      <Box sx={{ maxHeight: 300, overflowY: 'auto', my: 2 }}>
        {messages.map((msg, idx) => (
          <Box
            key={idx}
            sx={{
              textAlign: msg.role === 'user' ? 'right' : 'left',
              mb: 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                backgroundColor: msg.role === 'user' ? '#1976d2' : '#e0e0e0',
                color: msg.role === 'user' ? '#fff' : '#000',
                display: 'inline-block',
                borderRadius: 2,
                px: 2,
                py: 1,
              }}
            >
              {msg.content}
            </Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your question..."
        />
        <Button variant="contained" onClick={sendMessage}>
          Send
        </Button>
      </Box>
    </Paper>
  );
}
