
const express = require("express");
const router = express.Router();
const axios = require("axios");

router.post("/", async (req, res) => {
  const userMessage = req.body.message;

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct", // ✅ Replace with available OpenRouter model
        messages: [
          {
            role: "system",
            content: "You are a helpful hospital chatbot for patients. Provide friendly and accurate health advice.",
          },
          { role: "user", content: userMessage },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "HospitalChatBot",
        },
      }
    );

    res.json({ reply: response.data.choices[0].message.content });
  } catch (error) {
    console.error("🔴 OpenRouter API error:", error.response?.data || error.message);
    res.status(500).json({ reply: "Sorry, the assistant is currently unavailable." });
  }
});

module.exports = router;
